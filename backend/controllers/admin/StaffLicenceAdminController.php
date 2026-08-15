<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class StaffLicenceAdminController extends BaseController
{
    private StaffLicence $licences;
    private User $users;
    private Mailer $mailer;
    private array $app;

    public function __construct()
    {
        parent::__construct();
        $this->licences = new StaffLicence($this->db);
        $this->users = new User($this->db);
        $this->mailer = new Mailer();
        $this->app = require dirname(__DIR__, 2) . '/config/app.php';
    }

    private function requireMaster(): void
    {
        $user = $this->authUser();
        $role = $user['role'] ?? '';
        if (!in_array($role, ['admin', 'super_admin'], true)) {
            Response::jsonError('Master admin access required.', 403);
        }
    }

    public function features(array $params = []): void
    {
        $this->requireMaster();
        Response::jsonSuccess(StaffLicence::FEATURES);
    }

    public function pending(array $params = []): void
    {
        $this->requireMaster();
        Response::jsonSuccess($this->licences->listByStatuses(['pending_approval']));
    }

    public function index(array $params = []): void
    {
        $this->requireMaster();
        Response::jsonSuccess($this->licences->listExceptDeleted());
    }

    /** Step 1: staff email → OTP to developer inbox */
    public function start(array $params = []): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();
        $validator = Validator::make($input)->required('email')->email('email');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $email = strtolower(trim((string) $input['email']));
        $name = trim((string) ($input['name'] ?? ''));

        $blockingLicence = $this->licences->findBlockingByEmail($email);
        if ($blockingLicence) {
            Response::jsonError(
                $blockingLicence['status'] === 'banned'
                    ? 'This email is banned. Unban or delete the licence first.'
                    : 'This email already has an admin account.',
                422
            );
        }

        $existing = $this->users->findByEmail($email);
        if ($existing) {
            $role = $existing['role'] ?? '';
            if (in_array($role, ['admin', 'super_admin'], true)) {
                Response::jsonError('This email already has an admin account.', 422);
            }
            // Orphan staff left after a prior delete — remove so email can be re-licensed
            if ($role === 'staff') {
                $this->users->deleteStaffAccount((int) $existing['id']);
            }
        }

        $otp = (string) random_int(100000, 999999);
        $token = bin2hex(random_bytes(24));
        $id = $this->licences->create([
            'staff_email' => $email,
            'staff_name' => $name !== '' ? $name : null,
            'features' => [],
            'status' => 'awaiting_dev_otp',
            'developer_otp_hash' => hash('sha256', $otp),
            'developer_otp_expires' => date('Y-m-d H:i:s', time() + 600),
            'invite_token' => $token,
            'created_by' => $this->authUserId(),
        ]);

        $devEmail = $this->app['staff_licence_dev_email'] ?? 'naveenreddy.webdev@gmail.com';
        $sent = $this->mailer->send(
            $devEmail,
            'YULO Staff Licence OTP',
            '<p>A staff licence request was started for <strong>' . htmlspecialchars($email) . '</strong>.</p>'
            . '<p>Your verification OTP is:</p>'
            . '<p style="font-size:28px;font-weight:700;letter-spacing:6px;">' . htmlspecialchars($otp) . '</p>'
            . '<p>This code expires in 10 minutes.</p>'
        );

        if (!$sent) {
            Response::jsonError('Could not send OTP email. Check mail settings.', 500);
        }

        Response::jsonSuccess([
            'licence_id' => $id,
            'staff_email' => $email,
            'dev_email_masked' => $this->maskEmail($devEmail),
            'expires_in' => 600,
        ], 'OTP sent to developer email.');
    }

    /** Step 2: verify developer OTP */
    public function verifyDevOtp(array $params): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();
        $otp = trim((string) ($input['otp'] ?? ''));
        if (!preg_match('/^\d{6}$/', $otp)) {
            Response::jsonError('Enter the 6-digit OTP.', 422);
        }

        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || $raw['status'] !== 'awaiting_dev_otp') {
            Response::jsonError('Licence not found or not awaiting OTP.', 404);
        }

        if (empty($raw['developer_otp_expires']) || strtotime($raw['developer_otp_expires']) < time()) {
            Response::jsonError('OTP expired. Start again.', 422);
        }

        if (!hash_equals((string) $raw['developer_otp_hash'], hash('sha256', $otp))) {
            Response::jsonError('Invalid OTP.', 422);
        }

        $this->licences->update((int) $raw['id'], [
            'status' => 'features_pending',
            'developer_otp_hash' => null,
            'developer_otp_expires' => null,
        ]);

        Response::jsonSuccess([
            'licence_id' => (int) $raw['id'],
            'staff_email' => $raw['staff_email'],
            'features' => StaffLicence::FEATURES,
        ], 'OTP verified.');
    }

    /** Step 3–4: save features + temp password (email sent only via sendInvite) */
    public function assignFeatures(array $params): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();
        $features = $input['features'] ?? [];
        if (!is_array($features) || $features === []) {
            Response::jsonError('Select at least one feature.', 422);
        }

        $allowed = StaffLicence::featureKeys();
        $features = array_values(array_unique(array_filter($features, static fn($k) => in_array($k, $allowed, true))));
        if ($features === []) {
            Response::jsonError('Select at least one valid feature.', 422);
        }

        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || !in_array($raw['status'], ['features_pending', 'invite_sent'], true)) {
            Response::jsonError('Licence is not ready for feature assignment.', 422);
        }

        $tempPassword = $this->generateTempPassword();
        $adminUrl = rtrim((string) ($this->app['admin_url'] ?? 'http://localhost:5174'), '/');
        $inviteUrl = $adminUrl . '/staff-onboard/' . $raw['invite_token'];

        $this->licences->update((int) $raw['id'], [
            'features' => $features,
            'temp_password_hash' => Security::hashPassword($tempPassword),
            'status' => 'invite_sent',
            'member_otp_hash' => null,
            'member_otp_expires' => null,
            'member_otp_verified_at' => null,
        ]);

        Response::jsonSuccess([
            'licence_id' => (int) $raw['id'],
            'staff_email' => $raw['staff_email'],
            'staff_name' => $raw['staff_name'],
            'invite_url' => $inviteUrl,
            'temp_password' => $tempPassword,
            'features' => $features,
            'email_sent' => false,
        ], 'Invite ready. Click Processed Licence to email the member.');
    }

    /** Update features for an approved staff licence */
    public function updateFeatures(array $params): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();
        $features = $input['features'] ?? [];
        if (!is_array($features) || $features === []) {
            Response::jsonError('Select at least one feature.', 422);
        }

        $allowed = StaffLicence::featureKeys();
        $features = array_values(array_unique(array_filter($features, static fn($k) => in_array($k, $allowed, true))));
        if ($features === []) {
            Response::jsonError('Select at least one valid feature.', 422);
        }

        sort($features);

        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || ($raw['status'] ?? '') !== 'approved') {
            Response::jsonError('Only approved licences can update features.', 422);
        }

        $previous = is_array($raw['features'] ?? null) ? array_values($raw['features']) : [];
        $previous = array_values(array_unique(array_filter($previous, static fn($k) => in_array($k, $allowed, true))));
        sort($previous);

        if ($previous === $features) {
            Response::jsonSuccess(
                $this->licences->findById((int) $raw['id']),
                'No feature changes to save.'
            );
        }

        $added = array_values(array_diff($features, $previous));
        $removed = array_values(array_diff($previous, $features));

        $this->licences->update((int) $raw['id'], [
            'features' => $features,
        ]);

        if (!empty($raw['user_id'])) {
            $this->users->update((int) $raw['user_id'], [
                'permissions' => json_encode($features),
            ]);
        }

        $name = trim((string) ($raw['staff_name'] ?? ''));
        if ($name === '') {
            $name = explode('@', (string) $raw['staff_email'])[0] ?: 'there';
        }

        $adminUrl = rtrim((string) ($this->app['admin_url'] ?? 'http://localhost:5174'), '/');
        $loginUrl = $adminUrl . '/login?fresh=1';

        $addedHtml = $this->featureListHtml($added);
        $removedHtml = $this->featureListHtml($removed);
        $currentHtml = $this->featureListHtml($features);

        $sent = $this->mailer->send(
            (string) $raw['staff_email'],
            'YULO Admin access updated',
            '<p>Hi ' . htmlspecialchars($name) . ',</p>'
            . '<p>Your YULO Admin access was updated by a master admin.</p>'
            . '<p><strong>Added:</strong></p>' . $addedHtml
            . '<p><strong>Removed:</strong></p>' . $removedHtml
            . '<p><strong>Current access:</strong></p>' . $currentHtml
            . '<p>Login here: <a href="' . htmlspecialchars($loginUrl) . '">' . htmlspecialchars($loginUrl) . '</a></p>'
            . '<p>Sign in with your email and password to see the updated menu.</p>'
        );

        Response::jsonSuccess(
            [
                ...($this->licences->findById((int) $raw['id']) ?? []),
                'email_sent' => $sent,
                'added' => $added,
                'removed' => $removed,
            ],
            $sent ? 'Features updated and member notified by email.' : 'Features updated (email could not be sent).'
        );
    }

    /** Step 4: send invite email after master confirms Processed Licence */
    public function sendInvite(array $params): void
    {
        $this->requireMaster();
        $input = $this->getJsonInput();
        $tempPassword = trim((string) ($input['temp_password'] ?? ''));

        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || $raw['status'] !== 'invite_sent') {
            Response::jsonError('Licence is not ready to email.', 422);
        }

        if ($tempPassword === '' || empty($raw['temp_password_hash'])
            || !Security::verifyPassword($tempPassword, (string) $raw['temp_password_hash'])) {
            Response::jsonError('Temporary password does not match this invite.', 422);
        }

        $features = is_array($raw['features'] ?? null) ? $raw['features'] : [];
        $featureLabels = [];
        foreach (StaffLicence::FEATURES as $f) {
            if (in_array($f['key'], $features, true)) {
                $featureLabels[] = $f['label'];
            }
        }

        $adminUrl = rtrim((string) ($this->app['admin_url'] ?? 'http://localhost:5174'), '/');
        $inviteUrl = $adminUrl . '/staff-onboard/' . $raw['invite_token'];
        $email = $raw['staff_email'];

        $sent = $this->mailer->send(
            $email,
            'YULO Admin access invite',
            '<p>You have been invited to the YULO Admin panel.</p>'
            . '<p><strong>Temporary password:</strong> <code>' . htmlspecialchars($tempPassword) . '</code></p>'
            . '<p>Complete setup here:</p>'
            . '<p><a href="' . htmlspecialchars($inviteUrl) . '">' . htmlspecialchars($inviteUrl) . '</a></p>'
            . '<p>Access features:</p><ul><li>' . implode('</li><li>', array_map('htmlspecialchars', $featureLabels)) . '</li></ul>'
            . '<p>After you set your password, a master admin must approve your access.</p>'
        );

        if (!$sent) {
            Response::jsonError('Could not send invite email. Check mail settings.', 500);
        }

        Response::jsonSuccess([
            'licence_id' => (int) $raw['id'],
            'staff_email' => $email,
            'email_sent' => true,
        ], 'Invite emailed to staff.');
    }

    public function ban(array $params): void
    {
        $this->requireMaster();
        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw) {
            Response::jsonError('Licence not found.', 404);
        }
        if (!in_array($raw['status'], ['approved', 'pending_approval', 'invite_sent'], true)) {
            Response::jsonError('This licence cannot be banned.', 422);
        }

        if (!empty($raw['user_id'])) {
            $this->users->update((int) $raw['user_id'], ['status' => 'inactive']);
        }

        $this->licences->update((int) $raw['id'], [
            'status' => 'banned',
            'reviewed_by' => $this->authUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        Response::jsonSuccess($this->licences->findById((int) $raw['id']), 'Licence banned.');
    }

    public function unban(array $params): void
    {
        $this->requireMaster();
        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || $raw['status'] !== 'banned') {
            Response::jsonError('Licence is not banned.', 422);
        }

        $nextStatus = !empty($raw['user_id']) ? 'approved' : 'invite_sent';
        if (!empty($raw['user_id'])) {
            $this->users->update((int) $raw['user_id'], [
                'status' => 'active',
                'permissions' => json_encode($raw['features'] ?? []),
            ]);
        }

        $this->licences->update((int) $raw['id'], [
            'status' => $nextStatus,
            'reviewed_by' => $this->authUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        Response::jsonSuccess($this->licences->findById((int) $raw['id']), 'Licence restored.');
    }

    public function destroy(array $params): void
    {
        $this->requireMaster();
        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw) {
            Response::jsonError('Licence not found.', 404);
        }

        $staffUserId = !empty($raw['user_id']) ? (int) $raw['user_id'] : null;
        if (!$staffUserId) {
            $byEmail = $this->users->findByEmail((string) $raw['staff_email']);
            if ($byEmail && ($byEmail['role'] ?? '') === 'staff') {
                $staffUserId = (int) $byEmail['id'];
            }
        }

        $this->licences->update((int) $raw['id'], [
            'status' => 'deleted',
            'user_id' => null,
            'temp_password_hash' => null,
            'developer_otp_hash' => null,
            'member_otp_hash' => null,
            'reviewed_by' => $this->authUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        if ($staffUserId) {
            $this->users->deleteStaffAccount($staffUserId);
        }

        Response::jsonSuccess(null, 'Licence deleted.');
    }

    public function approve(array $params): void
    {
        $this->requireMaster();
        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || $raw['status'] !== 'pending_approval' || empty($raw['user_id'])) {
            Response::jsonError('No pending licence to approve.', 404);
        }

        $this->users->update((int) $raw['user_id'], [
            'status' => 'active',
            'email_verified_at' => date('Y-m-d H:i:s'),
            'permissions' => json_encode($raw['features'] ?? []),
        ]);

        $this->licences->update((int) $raw['id'], [
            'status' => 'approved',
            'reviewed_by' => $this->authUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        $user = $this->users->findById((int) $raw['user_id']);
        $adminUrl = rtrim((string) ($this->app['admin_url'] ?? 'http://localhost:5174'), '/');
        $loginUrl = $adminUrl . '/login?fresh=1';

        if ($user) {
            $this->mailer->send(
                $user['email'],
                'Welcome to YULO Admin',
                '<p>Hi ' . htmlspecialchars($user['name'] ?? 'there') . ',</p>'
                . '<p>Your admin access has been approved.</p>'
                . '<p>Login here: <a href="' . htmlspecialchars($loginUrl) . '">' . htmlspecialchars($loginUrl) . '</a></p>'
                . '<p>Use the email and password you created during setup.</p>'
            );
        }

        Response::jsonSuccess($this->licences->findById((int) $raw['id']), 'Licence approved. Welcome email sent.');
    }

    public function reject(array $params): void
    {
        $this->requireMaster();
        $raw = $this->licences->findRawById((int) $params['id']);
        if (!$raw || $raw['status'] !== 'pending_approval') {
            Response::jsonError('No pending licence to reject.', 404);
        }

        if (!empty($raw['user_id'])) {
            $this->users->update((int) $raw['user_id'], ['status' => 'inactive']);
        }

        $this->licences->update((int) $raw['id'], [
            'status' => 'rejected',
            'reviewed_by' => $this->authUserId(),
            'reviewed_at' => date('Y-m-d H:i:s'),
        ]);

        Response::jsonSuccess($this->licences->findById((int) $raw['id']), 'Licence rejected.');
    }

    private function generateTempPassword(): string
    {
        $chunk = static fn () => strtoupper(substr(bin2hex(random_bytes(3)), 0, 4));
        return 'Yulo-' . $chunk() . '-' . $chunk();
    }

    /** @param list<string> $keys */
    private function featureListHtml(array $keys): string
    {
        if ($keys === []) {
            return '<p><em>None</em></p>';
        }

        $labels = [];
        foreach (StaffLicence::FEATURES as $f) {
            if (in_array($f['key'], $keys, true)) {
                $labels[] = $f['label'];
            }
        }

        if ($labels === []) {
            return '<p><em>None</em></p>';
        }

        return '<ul><li>' . implode('</li><li>', array_map('htmlspecialchars', $labels)) . '</li></ul>';
    }

    private function maskEmail(string $email): string
    {
        [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');
        if ($local === '' || $domain === '') {
            return '***';
        }
        $visible = substr($local, 0, 2);
        return $visible . str_repeat('*', max(strlen($local) - 2, 3)) . '@' . $domain;
    }
}

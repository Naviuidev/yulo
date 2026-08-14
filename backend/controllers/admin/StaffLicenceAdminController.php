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
        Response::jsonSuccess($this->licences->listByStatuses([
            'awaiting_dev_otp',
            'features_pending',
            'invite_sent',
            'pending_approval',
            'approved',
            'rejected',
        ]));
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

        $existing = $this->users->findByEmail($email);
        if ($existing && in_array($existing['role'], ['admin', 'super_admin', 'staff'], true)) {
            Response::jsonError('This email already has an admin account.', 422);
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

    /** Step 3–4: save features, generate temp password, email member */
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

        $featureLabels = [];
        foreach (StaffLicence::FEATURES as $f) {
            if (in_array($f['key'], $features, true)) {
                $featureLabels[] = $f['label'];
            }
        }

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

        Response::jsonSuccess([
            'licence_id' => (int) $raw['id'],
            'staff_email' => $email,
            'invite_url' => $inviteUrl,
            'temp_password' => $tempPassword,
            'features' => $features,
            'email_sent' => $sent,
        ], $sent ? 'Invite sent to staff email.' : 'Temp password generated (email may have failed — share manually).');
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
        $loginUrl = $adminUrl . '/login';

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

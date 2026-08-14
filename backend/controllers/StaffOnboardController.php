<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class StaffOnboardController extends BaseController
{
    private StaffLicence $licences;
    private User $users;
    private Mailer $mailer;

    public function __construct()
    {
        parent::__construct();
        $this->licences = new StaffLicence($this->db);
        $this->users = new User($this->db);
        $this->mailer = new Mailer();
    }

    public function show(array $params): void
    {
        $lic = $this->licences->findByToken((string) ($params['token'] ?? ''));
        if (!$lic) {
            Response::jsonError('Invite not found.', 404);
        }

        if (!in_array($lic['status'], ['invite_sent', 'pending_approval'], true)) {
            Response::jsonError('This invite is no longer available.', 422, [], [
                'status' => $lic['status'],
            ]);
        }

        Response::jsonSuccess([
            'staff_email' => $lic['staff_email'],
            'staff_name' => $lic['staff_name'],
            'status' => $lic['status'],
            'features' => $lic['features'],
            'otp_verified' => !empty($lic['member_otp_verified_at']),
        ]);
    }

    public function sendOtp(array $params): void
    {
        $raw = $this->licences->findRawByToken((string) ($params['token'] ?? ''));
        if (!$raw || $raw['status'] !== 'invite_sent') {
            Response::jsonError('Invite not found or already completed.', 404);
        }

        $input = $this->getJsonInput();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        if ($email === '' || $email !== strtolower((string) $raw['staff_email'])) {
            Response::jsonError('Email does not match this invite.', 422);
        }

        $otp = (string) random_int(100000, 999999);
        $this->licences->update((int) $raw['id'], [
            'member_otp_hash' => hash('sha256', $otp),
            'member_otp_expires' => date('Y-m-d H:i:s', time() + 600),
            'member_otp_verified_at' => null,
        ]);

        $sent = $this->mailer->send(
            $email,
            'YULO Admin setup OTP',
            '<p>Your OTP to continue admin setup is:</p>'
            . '<p style="font-size:28px;font-weight:700;letter-spacing:6px;">' . htmlspecialchars($otp) . '</p>'
            . '<p>Expires in 10 minutes.</p>'
        );

        if (!$sent) {
            Response::jsonError('Could not send OTP. Try again later.', 500);
        }

        Response::jsonSuccess([
            'email' => $email,
            'expires_in' => 600,
        ], 'OTP sent to your email.');
    }

    public function verifyOtp(array $params): void
    {
        $raw = $this->licences->findRawByToken((string) ($params['token'] ?? ''));
        if (!$raw || $raw['status'] !== 'invite_sent') {
            Response::jsonError('Invite not found or already completed.', 404);
        }

        $input = $this->getJsonInput();
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $otp = trim((string) ($input['otp'] ?? ''));

        if ($email !== strtolower((string) $raw['staff_email'])) {
            Response::jsonError('Email does not match this invite.', 422);
        }
        if (!preg_match('/^\d{6}$/', $otp)) {
            Response::jsonError('Enter the 6-digit OTP.', 422);
        }
        if (empty($raw['member_otp_expires']) || strtotime((string) $raw['member_otp_expires']) < time()) {
            Response::jsonError('OTP expired. Request a new one.', 422);
        }
        if (!hash_equals((string) $raw['member_otp_hash'], hash('sha256', $otp))) {
            Response::jsonError('Invalid OTP.', 422);
        }

        $this->licences->update((int) $raw['id'], [
            'member_otp_verified_at' => date('Y-m-d H:i:s'),
        ]);

        Response::jsonSuccess([
            'staff_email' => $raw['staff_email'],
            'otp_verified' => true,
        ], 'OTP verified. Set your password next.');
    }

    public function complete(array $params): void
    {
        $raw = $this->licences->findRawByToken((string) ($params['token'] ?? ''));
        if (!$raw || $raw['status'] !== 'invite_sent') {
            Response::jsonError('Invite not found or already completed.', 404);
        }

        if (empty($raw['member_otp_verified_at'])) {
            Response::jsonError('Verify the OTP sent to your email first.', 422);
        }

        $input = $this->getJsonInput();
        $validator = Validator::make($input)
            ->required('email')
            ->email('email')
            ->required('temp_password')
            ->required('password')
            ->min('password', 8)
            ->confirmed('password');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $email = strtolower(trim((string) $input['email']));
        if ($email !== strtolower((string) $raw['staff_email'])) {
            Response::jsonError('Email does not match this invite.', 422);
        }

        if (
            empty($raw['temp_password_hash'])
            || !Security::verifyPassword((string) $input['temp_password'], (string) $raw['temp_password_hash'])
        ) {
            Response::jsonError('Temporary password is incorrect.', 422);
        }

        $name = trim((string) ($input['name'] ?? $raw['staff_name'] ?? ''));
        if ($name === '') {
            $name = explode('@', $email)[0] ?: 'Staff';
        }

        $existing = $this->users->findByEmail($email);
        $permissionsJson = json_encode($raw['features'] ?? []);

        if ($existing) {
            if ($existing['role'] === 'customer') {
                $this->users->update((int) $existing['id'], [
                    'name' => $name,
                    'password' => Security::hashPassword((string) $input['password']),
                    'role' => 'staff',
                    'status' => 'inactive',
                    'permissions' => $permissionsJson,
                    'email_verified_at' => null,
                ]);
                $userId = (int) $existing['id'];
            } elseif ($existing['role'] === 'staff' && ($existing['status'] ?? '') === 'inactive') {
                $this->users->update((int) $existing['id'], [
                    'name' => $name,
                    'password' => Security::hashPassword((string) $input['password']),
                    'permissions' => $permissionsJson,
                ]);
                $userId = (int) $existing['id'];
            } else {
                Response::jsonError('This email cannot complete staff setup.', 422);
            }
        } else {
            $userId = $this->users->create([
                'name' => $name,
                'email' => $email,
                'password' => Security::hashPassword((string) $input['password']),
                'role' => 'staff',
                'status' => 'inactive',
            ]);
            $this->users->update($userId, [
                'permissions' => $permissionsJson,
            ]);
        }

        $this->licences->update((int) $raw['id'], [
            'status' => 'pending_approval',
            'user_id' => $userId,
            'staff_name' => $name,
            'temp_password_hash' => null,
            'member_otp_hash' => null,
            'member_otp_expires' => null,
        ]);

        Response::jsonSuccess([
            'status' => 'pending_approval',
            'message' => 'Setup complete. Waiting for master admin approval.',
        ], 'Submitted for master admin approval.');
    }
}

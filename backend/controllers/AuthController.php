<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class AuthController extends BaseController
{
    private User $userModel;
    private const OTP_TTL_MINUTES = 10;

    public function __construct()
    {
        parent::__construct();
        $this->userModel = new User($this->db);
    }

    public function register(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)
            ->required('name')
            ->required('email')
            ->email('email')
            ->required('password')
            ->min('password', 8)
            ->confirmed('password');

        if (!empty($input['phone'])) {
            $validator->phone('phone');
        }

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $email = strtolower(trim($input['email']));
        $existing = $this->userModel->findByEmail($email);

        if ($existing) {
            $verified = !empty($existing['email_verified_at']);
            $active = ($existing['status'] ?? '') === 'active';

            if ($verified || $active) {
                Response::jsonError('Validation failed.', 422, ['email' => ['Email is already registered.']]);
            }

            // Unverified signup — update details and resend OTP
            $this->userModel->update((int) $existing['id'], [
                'name' => $input['name'],
                'password' => Security::hashPassword($input['password']),
                'phone' => $input['phone'] ?? null,
                'status' => 'inactive',
            ]);
            $userId = (int) $existing['id'];
        } else {
            $userId = $this->userModel->create([
                'name' => $input['name'],
                'email' => $email,
                'password' => Security::hashPassword($input['password']),
                'phone' => $input['phone'] ?? null,
                'role' => 'customer',
                'status' => 'inactive',
            ]);
        }

        $sent = $this->createAndSendOtp($userId, $email, $input['name']);

        if (!$sent) {
            Response::jsonError('Account created but failed to send OTP email. Please try resend.', 502, [], [
                'requires_otp' => true,
                'email' => $email,
            ]);
        }

        Response::jsonSuccess([
            'requires_otp' => true,
            'email' => $email,
            'otp_expires_in' => self::OTP_TTL_MINUTES * 60,
        ], 'OTP sent to your email. Please verify to activate your account.', 201);
    }

    public function login(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)->required('email')->email('email')->required('password');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $user = $this->userModel->findByEmail(strtolower(trim($input['email'])));

        if (!$user || !Security::verifyPassword($input['password'], $user['password'])) {
            Response::jsonError('Invalid email or password.', 401);
        }

        if (empty($user['email_verified_at']) || ($user['status'] ?? '') !== 'active') {
            $this->createAndSendOtp((int) $user['id'], $user['email'], $user['name'] ?? 'Customer');
            Response::jsonError(
                'Please verify your email with the OTP we just sent.',
                403,
                [],
                [
                    'requires_otp' => true,
                    'email' => $user['email'],
                ]
            );
        }

        $tokens = $this->issueTokens((int) $user['id'], $user['role']);

        unset($user['password']);

        Response::jsonSuccess([
            'user' => $user,
            'tokens' => $tokens,
        ], 'Login successful.');
    }

    public function logout(array $params = []): void
    {
        $input = $this->getJsonInput();
        if (!empty($input['refresh_token'])) {
            $this->userModel->revokeRefreshToken($input['refresh_token']);
        }

        Response::jsonSuccess(null, 'Logged out successfully.');
    }

    public function me(array $params = []): void
    {
        $user = $this->authUser();
        Response::jsonSuccess($user, 'User profile retrieved.');
    }

    public function refresh(array $params = []): void
    {
        $input = $this->getJsonInput();

        if (empty($input['refresh_token'])) {
            Response::jsonError('Refresh token is required.', 422);
        }

        $stored = $this->userModel->findRefreshToken($input['refresh_token']);

        if (!$stored || $stored['status'] !== 'active') {
            Response::jsonError('Invalid refresh token.', 401);
        }

        $this->userModel->revokeRefreshToken($input['refresh_token']);
        $tokens = $this->issueTokens((int) $stored['user_id'], $stored['role']);

        Response::jsonSuccess(['tokens' => $tokens], 'Token refreshed.');
    }

    public function forgotPassword(array $params = []): void
    {
        $input = $this->getJsonInput();
        $validator = Validator::make($input)->required('email')->email('email');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $user = $this->userModel->findByEmail(strtolower(trim($input['email'])));

        if ($user) {
            $token = Security::generateToken();
            $stmt = $this->db->prepare(
                'UPDATE users SET reset_token = :token, reset_token_expires = DATE_ADD(NOW(), INTERVAL 1 HOUR), updated_at = NOW() WHERE id = :id'
            );
            $stmt->execute(['token' => hash('sha256', $token), 'id' => $user['id']]);

            $appConfig = require dirname(__DIR__) . '/config/app.php';
            $resetLink = $appConfig['frontend_url'] . '/reset-password?token=' . $token;

            $mailer = new Mailer();
            $mailer->send(
                $user['email'],
                'Reset Your Password - YULO',
                "<p>Click <a href=\"{$resetLink}\">here</a> to reset your password. Link expires in 1 hour.</p>"
            );
        }

        Response::jsonSuccess(null, 'If the email exists, a reset link has been sent.');
    }

    public function resetPassword(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)
            ->required('token')
            ->required('password')
            ->min('password', 8)
            ->confirmed('password');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $stmt = $this->db->prepare(
            'SELECT id FROM users WHERE reset_token = :token AND reset_token_expires > NOW() LIMIT 1'
        );
        $stmt->execute(['token' => hash('sha256', $input['token'])]);
        $user = $stmt->fetch();

        if (!$user) {
            Response::jsonError('Invalid or expired reset token.', 400);
        }

        $stmt = $this->db->prepare(
            'UPDATE users SET password = :password, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'password' => Security::hashPassword($input['password']),
            'id' => $user['id'],
        ]);

        Response::jsonSuccess(null, 'Password reset successful.');
    }

    /** Verify Gmail OTP (preferred) or legacy long token. */
    public function verifyEmail(array $params = []): void
    {
        $input = $this->getJsonInput();
        $otp = trim((string) ($input['otp'] ?? ''));
        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $token = trim((string) ($input['token'] ?? ''));

        if ($otp !== '' && $email !== '') {
            $this->verifyOtpAndActivate($email, $otp);
            return;
        }

        if ($token === '') {
            Response::jsonError('OTP and email are required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT user_id FROM email_verification_tokens WHERE token = :token AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['token' => hash('sha256', $token)]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::jsonError('Invalid or expired verification code.', 400);
        }

        $this->activateUser((int) $record['user_id']);
    }

    public function resendOtp(array $params = []): void
    {
        $input = $this->getJsonInput();
        $validator = Validator::make($input)->required('email')->email('email');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $email = strtolower(trim($input['email']));
        $user = $this->userModel->findByEmail($email);

        // Always return success to avoid email enumeration
        if (!$user) {
            Response::jsonSuccess(null, 'If the email exists, a new OTP has been sent.');
        }

        if (!empty($user['email_verified_at']) && ($user['status'] ?? '') === 'active') {
            Response::jsonSuccess(null, 'Email is already verified. Please login.');
        }

        $sent = $this->createAndSendOtp((int) $user['id'], $user['email'], $user['name'] ?? 'Customer');

        if (!$sent) {
            Response::jsonError('Failed to send OTP email. Please try again shortly.', 502);
        }

        Response::jsonSuccess([
            'requires_otp' => true,
            'email' => $email,
            'otp_expires_in' => self::OTP_TTL_MINUTES * 60,
        ], 'A new OTP has been sent to your email.');
    }

    private function verifyOtpAndActivate(string $email, string $otp): void
    {
        if (!preg_match('/^\d{6}$/', $otp)) {
            Response::jsonError('Enter the 6-digit OTP from your email.', 422);
        }

        $user = $this->userModel->findByEmail($email);
        if (!$user) {
            Response::jsonError('Invalid or expired OTP.', 400);
        }

        $stmt = $this->db->prepare(
            'SELECT id FROM email_verification_tokens
             WHERE user_id = :user_id AND token = :token AND expires_at > NOW()
             ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute([
            'user_id' => $user['id'],
            'token' => hash('sha256', $otp),
        ]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::jsonError('Invalid or expired OTP.', 400);
        }

        $this->activateUser((int) $user['id']);
    }

    private function activateUser(int $userId): void
    {
        $stmt = $this->db->prepare(
            "UPDATE users SET email_verified_at = NOW(), status = 'active', updated_at = NOW() WHERE id = :id"
        );
        $stmt->execute(['id' => $userId]);

        $stmt = $this->db->prepare('DELETE FROM email_verification_tokens WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);

        $user = $this->userModel->findById($userId);
        $tokens = $this->issueTokens($userId, $user['role'] ?? 'customer');

        Response::jsonSuccess([
            'user' => $user,
            'tokens' => $tokens,
        ], 'Email verified successfully. Account activated.');
    }

    private function createAndSendOtp(int $userId, string $email, string $name): bool
    {
        $otp = (string) random_int(100000, 999999);

        $this->db->prepare('DELETE FROM email_verification_tokens WHERE user_id = :user_id')
            ->execute(['user_id' => $userId]);

        $stmt = $this->db->prepare(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at)
             VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL ' . self::OTP_TTL_MINUTES . ' MINUTE), NOW())'
        );
        $stmt->execute([
            'user_id' => $userId,
            'token' => hash('sha256', $otp),
        ]);

        $safeName = htmlspecialchars($name !== '' ? $name : 'there', ENT_QUOTES, 'UTF-8');
        $body = <<<HTML
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="letter-spacing: 0.12em; text-transform: uppercase;">YULO</h2>
    <p>Hi {$safeName},</p>
    <p>Use this one-time password to verify your YULO account:</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 0.25em; margin: 24px 0;">{$otp}</p>
    <p>This code expires in <strong>10 minutes</strong>.</p>
    <p style="color: #666; font-size: 13px;">If you did not create a YULO account, you can ignore this email.</p>
  </div>
</body>
</html>
HTML;

        $mailer = new Mailer();
        return $mailer->send($email, 'Your YULO verification code', $body, true);
    }

    private function issueTokens(int $userId, string $role): array
    {
        $accessToken = JWT::encode(['sub' => $userId, 'role' => $role]);
        $refreshToken = JWT::encodeRefresh(['sub' => $userId, 'type' => 'refresh']);

        $config = require dirname(__DIR__) . '/config/app.php';
        $expiresAt = date('Y-m-d H:i:s', time() + $config['jwt']['refresh_expiry']);
        $this->userModel->storeRefreshToken($userId, $refreshToken, $expiresAt);

        return [
            'access_token' => $accessToken,
            'refresh_token' => $refreshToken,
            'token_type' => 'Bearer',
            'expires_in' => $config['jwt']['expiry'],
        ];
    }
}

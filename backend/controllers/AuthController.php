<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class AuthController extends BaseController
{
    private User $userModel;

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
            ->unique($this->db, 'email', 'users', 'email')
            ->required('password')
            ->min('password', 8)
            ->confirmed('password');

        if (!empty($input['phone'])) {
            $validator->phone('phone');
        }

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $userId = $this->userModel->create([
            'name' => $input['name'],
            'email' => strtolower(trim($input['email'])),
            'password' => Security::hashPassword($input['password']),
            'phone' => $input['phone'] ?? null,
            'role' => 'customer',
            'status' => 'active',
        ]);

        $verifyToken = Security::generateToken();
        $stmt = $this->db->prepare(
            'INSERT INTO email_verification_tokens (user_id, token, expires_at, created_at) VALUES (:user_id, :token, DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW())'
        );
        $stmt->execute(['user_id' => $userId, 'token' => hash('sha256', $verifyToken)]);

        $tokens = $this->issueTokens($userId, 'customer');

        Response::jsonSuccess([
            'user' => $this->userModel->findById($userId),
            'tokens' => $tokens,
            'verification_token' => $verifyToken,
        ], 'Registration successful.', 201);
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

        if ($user['status'] !== 'active') {
            Response::jsonError('Account is inactive.', 403);
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

    public function verifyEmail(array $params = []): void
    {
        $input = $this->getJsonInput();

        if (empty($input['token'])) {
            Response::jsonError('Verification token is required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT user_id FROM email_verification_tokens WHERE token = :token AND expires_at > NOW() LIMIT 1'
        );
        $stmt->execute(['token' => hash('sha256', $input['token'])]);
        $record = $stmt->fetch();

        if (!$record) {
            Response::jsonError('Invalid or expired verification token.', 400);
        }

        $stmt = $this->db->prepare('UPDATE users SET email_verified_at = NOW(), updated_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $record['user_id']]);

        $stmt = $this->db->prepare('DELETE FROM email_verification_tokens WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $record['user_id']]);

        Response::jsonSuccess(null, 'Email verified successfully.');
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

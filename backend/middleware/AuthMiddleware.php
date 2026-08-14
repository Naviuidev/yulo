<?php

declare(strict_types=1);

final class AuthMiddleware
{
    public function handle(): bool
    {
        $token = JWT::extractBearerToken();

        if (!$token) {
            Response::jsonError('Authentication required.', 401);
            return false;
        }

        $payload = JWT::decode($token);

        if (!$payload || empty($payload['sub'])) {
            Response::jsonError('Invalid or expired token.', 401);
            return false;
        }

        $pdo = Database::getInstance();
        $stmt = $pdo->prepare(
            'SELECT id, name, email, phone, role, permissions, status, email_verified_at
             FROM users WHERE id = :id AND status = :status LIMIT 1'
        );
        $stmt->execute(['id' => $payload['sub'], 'status' => 'active']);
        $user = $stmt->fetch();

        if (!$user) {
            Response::jsonError('User not found or inactive.', 401);
            return false;
        }

        if (isset($user['permissions']) && is_string($user['permissions'])) {
            $decoded = json_decode($user['permissions'], true);
            $user['permissions'] = is_array($decoded) ? $decoded : null;
        }

        $GLOBALS['auth_user'] = $user;
        $GLOBALS['auth_payload'] = $payload;

        return true;
    }
}

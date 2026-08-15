<?php

declare(strict_types=1);

final class User
{
    public function __construct(private PDO $db)
    {
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, email, phone, role, permissions, status, email_verified_at, created_at
             FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();
        if (!$user) {
            return null;
        }
        if (isset($user['permissions']) && is_string($user['permissions'])) {
            $decoded = json_decode($user['permissions'], true);
            $user['permissions'] = is_array($decoded) ? $decoded : null;
        }
        return $user;
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();
        return $user ?: null;
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO users (name, email, password, phone, role, status, created_at, updated_at)
             VALUES (:name, :email, :password, :phone, :role, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'phone' => $data['phone'] ?? null,
            'role' => $data['role'] ?? 'customer',
            'status' => $data['status'] ?? 'active',
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];

        foreach ($data as $key => $value) {
            $fields[] = "{$key} = :{$key}";
            $params[$key] = $value;
        }

        if (empty($fields)) {
            return false;
        }

        $fields[] = 'updated_at = NOW()';
        $sql = 'UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }

    public function storeRefreshToken(int $userId, string $token, string $expiresAt): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO refresh_tokens (user_id, token, expires_at, created_at) VALUES (:user_id, :token, :expires_at, NOW())'
        );
        $stmt->execute(['user_id' => $userId, 'token' => hash('sha256', $token), 'expires_at' => $expiresAt]);
    }

    public function findRefreshToken(string $token): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT rt.*, u.id as user_id, u.email, u.role, u.status
             FROM refresh_tokens rt
             JOIN users u ON u.id = rt.user_id
             WHERE rt.token = :token AND rt.expires_at > NOW() AND rt.revoked_at IS NULL
             LIMIT 1'
        );
        $stmt->execute(['token' => hash('sha256', $token)]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function revokeRefreshToken(string $token): void
    {
        $stmt = $this->db->prepare('UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = :token');
        $stmt->execute(['token' => hash('sha256', $token)]);
    }

    /**
     * Revoke staff admin access so the email can be re-licensed.
     * Demotes to customer instead of hard-deleting (orders/addresses FKs).
     */
    public function deleteStaffAccount(int $id): bool
    {
        $user = $this->findById($id);
        if (!$user || ($user['role'] ?? '') !== 'staff') {
            return false;
        }

        $this->db->prepare('DELETE FROM refresh_tokens WHERE user_id = :id')->execute(['id' => $id]);

        try {
            $this->db->prepare('DELETE FROM admin_notification_reads WHERE user_id = :id')->execute(['id' => $id]);
        } catch (Throwable) {
            // table may not exist on older DBs
        }

        $this->db->prepare(
            'UPDATE admin_staff_licences SET user_id = NULL WHERE user_id = :id'
        )->execute(['id' => $id]);

        return $this->update($id, [
            'role' => 'customer',
            'permissions' => null,
            'status' => 'active',
        ]);
    }
}

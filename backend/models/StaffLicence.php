<?php

declare(strict_types=1);

final class StaffLicence
{
    /** Feature keys available for staff access (maps to admin nav). */
    public const FEATURES = [
        ['key' => 'dashboard', 'label' => 'Dashboard', 'path' => '/'],
        ['key' => 'orders', 'label' => 'Orders', 'path' => '/orders'],
        ['key' => 'customers', 'label' => 'Customers', 'path' => '/customers'],
        ['key' => 'products', 'label' => 'Products', 'path' => '/products'],
        ['key' => 'categories', 'label' => 'Categories', 'path' => '/categories'],
        ['key' => 'brands', 'label' => 'Brands & Sections', 'path' => '/brands'],
        ['key' => 'inventory', 'label' => 'Inventory', 'path' => '/inventory'],
        ['key' => 'deliveries', 'label' => 'Deliveries', 'path' => '/deliveries'],
        ['key' => 'shiprocket', 'label' => 'Shiprocket', 'path' => '/shiprocket'],
        ['key' => 'followups', 'label' => 'Followups', 'path' => '/followups'],
        ['key' => 'offer-strips', 'label' => 'Offers', 'path' => '/offer-strips'],
        ['key' => 'faqs', 'label' => 'FAQs', 'path' => '/faqs'],
        ['key' => 'reviews', 'label' => 'Reviews', 'path' => '/reviews'],
        ['key' => 'notifications', 'label' => 'Notifications', 'path' => '/notifications'],
        ['key' => 'visitors', 'label' => 'Visitors', 'path' => '/visitors'],
        ['key' => 'payments', 'label' => 'Payments', 'path' => '/payments'],
        ['key' => 'social-connects', 'label' => 'Configure Social Connects', 'path' => '/social-connects'],
        ['key' => 'marketing', 'label' => 'Marketing', 'path' => '/marketing'],
        ['key' => 'marketing-free', 'label' => 'Marketing (Paid)', 'path' => '/marketing-free'],
        ['key' => 'doc', 'label' => 'Doc', 'path' => '/doc'],
    ];

    public function __construct(private PDO $db)
    {
    }

    public static function featureKeys(): array
    {
        return array_column(self::FEATURES, 'key');
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_staff_licences WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->hydrate($row) : null;
    }

    public function findByToken(string $token): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_staff_licences WHERE invite_token = :token LIMIT 1');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        return $row ? $this->hydrate($row) : null;
    }

    /** Any non-finished licence that should block issuing a new one for this email. */
    public function findBlockingByEmail(string $email): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM admin_staff_licences
             WHERE staff_email = :email
               AND status IN (
                 'awaiting_dev_otp',
                 'features_pending',
                 'invite_sent',
                 'pending_approval',
                 'approved',
                 'banned'
               )
             ORDER BY id DESC
             LIMIT 1"
        );
        $stmt->execute(['email' => strtolower(trim($email))]);
        $row = $stmt->fetch();
        return $row ? $this->hydrate($row) : null;
    }

    public function listByStatuses(array $statuses): array
    {
        if ($statuses === []) {
            return [];
        }
        $placeholders = [];
        $bind = [];
        foreach (array_values($statuses) as $i => $status) {
            $key = 's' . $i;
            $placeholders[] = ':' . $key;
            $bind[$key] = $status;
        }
        $in = implode(',', $placeholders);
        $stmt = $this->db->prepare(
            "SELECT * FROM admin_staff_licences WHERE status IN ({$in}) ORDER BY updated_at DESC"
        );
        $stmt->execute($bind);
        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    /** All licences except permanently deleted ones. */
    public function listExceptDeleted(): array
    {
        $stmt = $this->db->prepare(
            "SELECT * FROM admin_staff_licences
             WHERE status <> 'deleted'
             ORDER BY updated_at DESC, id DESC"
        );
        $stmt->execute();
        return array_map([$this, 'hydrate'], $stmt->fetchAll());
    }

    public function create(array $data): int
    {
        $stmt = $this->db->prepare(
            'INSERT INTO admin_staff_licences
                (staff_email, staff_name, features, status, developer_otp_hash, developer_otp_expires,
                 invite_token, created_by, created_at, updated_at)
             VALUES
                (:staff_email, :staff_name, :features, :status, :developer_otp_hash, :developer_otp_expires,
                 :invite_token, :created_by, NOW(), NOW())'
        );
        $stmt->execute([
            'staff_email' => $data['staff_email'],
            'staff_name' => $data['staff_name'] ?? null,
            'features' => json_encode($data['features'] ?? []),
            'status' => $data['status'] ?? 'awaiting_dev_otp',
            'developer_otp_hash' => $data['developer_otp_hash'],
            'developer_otp_expires' => $data['developer_otp_expires'],
            'invite_token' => $data['invite_token'],
            'created_by' => $data['created_by'] ?? null,
        ]);
        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, array $data): bool
    {
        $fields = [];
        $params = ['id' => $id];
        foreach ($data as $key => $value) {
            if ($key === 'features' && is_array($value)) {
                $value = json_encode(array_values($value));
            }
            $fields[] = "{$key} = :{$key}";
            $params[$key] = $value;
        }
        if ($fields === []) {
            return false;
        }
        $fields[] = 'updated_at = NOW()';
        $stmt = $this->db->prepare('UPDATE admin_staff_licences SET ' . implode(', ', $fields) . ' WHERE id = :id');
        return $stmt->execute($params);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM admin_staff_licences WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    private function hydrate(array $row): array
    {
        if (isset($row['features']) && is_string($row['features'])) {
            $decoded = json_decode($row['features'], true);
            $row['features'] = is_array($decoded) ? $decoded : [];
        }
        unset(
            $row['developer_otp_hash'],
            $row['member_otp_hash'],
            $row['temp_password_hash']
        );
        return $row;
    }

    /** Hydrate without stripping secrets (internal use). */
    public function findRawById(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_staff_licences WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (isset($row['features']) && is_string($row['features'])) {
            $decoded = json_decode($row['features'], true);
            $row['features'] = is_array($decoded) ? $decoded : [];
        }
        return $row;
    }

    public function findRawByToken(string $token): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM admin_staff_licences WHERE invite_token = :token LIMIT 1');
        $stmt->execute(['token' => $token]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }
        if (isset($row['features']) && is_string($row['features'])) {
            $decoded = json_decode($row['features'], true);
            $row['features'] = is_array($decoded) ? $decoded : [];
        }
        return $row;
    }
}

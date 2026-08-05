<?php

declare(strict_types=1);

final class Coupon
{
    public function __construct(private PDO $db)
    {
    }

    public function findByCode(string $code): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT * FROM coupons WHERE code = :code AND status = :status LIMIT 1'
        );
        $stmt->execute(['code' => strtoupper($code), 'status' => 'active']);
        return $stmt->fetch() ?: null;
    }

    public function incrementUsage(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}

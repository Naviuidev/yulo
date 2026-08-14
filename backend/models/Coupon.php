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
        $stmt->execute(['code' => strtoupper(trim($code)), 'status' => 'active']);
        return $stmt->fetch() ?: null;
    }

    /** True when expires_at date has fully passed (valid through end of that day). */
    public function isExpired(array $coupon): bool
    {
        $raw = trim((string) ($coupon['expires_at'] ?? ''));
        if ($raw === '') {
            return false;
        }

        // Accept DATE or DATETIME; treat the calendar day as inclusive until 23:59:59.
        if (preg_match('/^(\d{4}-\d{2}-\d{2})/', $raw, $m)) {
            $endOfDay = strtotime($m[1] . ' 23:59:59');
            return $endOfDay !== false && $endOfDay < time();
        }

        $ts = strtotime($raw);
        return $ts !== false && $ts < time();
    }

    /**
     * Percentage → % of subtotal (optional max_discount cap).
     * Fixed → flat ₹ amount. Never exceeds subtotal.
     *
     * @param array<string, mixed> $coupon
     */
    public function calculateDiscount(array $coupon, float $subtotal): float
    {
        if ($subtotal <= 0) {
            return 0.0;
        }

        $type = (string) ($coupon['type'] ?? 'fixed');
        $value = (float) ($coupon['value'] ?? 0);
        if ($value <= 0) {
            return 0.0;
        }

        if ($type === 'percentage') {
            $discount = round($subtotal * ($value / 100), 2);
            if (isset($coupon['max_discount']) && $coupon['max_discount'] !== null && $coupon['max_discount'] !== '') {
                $discount = min($discount, (float) $coupon['max_discount']);
            }
        } else {
            $discount = round($value, 2);
        }

        return min(max(0.0, $discount), round($subtotal, 2));
    }

    public function incrementUsage(int $id): void
    {
        $stmt = $this->db->prepare('UPDATE coupons SET used_count = used_count + 1, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $id]);
    }
}

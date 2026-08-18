<?php

declare(strict_types=1);

/**
 * Single published payment gateway for storefront checkout.
 * Values: phonepe | cashfree | paytm | razorpay | payu | (empty).
 */
final class PaymentGatewaySettings
{
    public const PUBLISHED_KEY = 'payment_published_gateway';

    public const GATEWAYS = ['phonepe', 'cashfree', 'paytm', 'razorpay', 'payu'];

    public static function label(string $gateway): string
    {
        return match ($gateway) {
            'phonepe' => 'PhonePe',
            'cashfree' => 'Easy Cash (Cashfree)',
            'paytm' => 'Paytm',
            'razorpay' => 'Razorpay',
            'payu' => 'PayU',
            default => $gateway !== '' ? $gateway : 'None',
        };
    }

    public static function getPublished(PDO $db): string
    {
        $stmt = $db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => self::PUBLISHED_KEY]);
        $value = trim((string) ($stmt->fetchColumn() ?: ''));
        return in_array($value, self::GATEWAYS, true) ? $value : '';
    }

    public static function setPublished(PDO $db, string $gateway): void
    {
        $gateway = in_array($gateway, self::GATEWAYS, true) ? $gateway : '';
        $stmt = $db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 1, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 1, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => self::PUBLISHED_KEY,
            'value' => $gateway,
            'group' => 'payment',
            'value_update' => $gateway,
            'group_update' => 'payment',
        ]);
    }

    public static function unpublish(PDO $db): void
    {
        self::setPublished($db, '');
    }
}

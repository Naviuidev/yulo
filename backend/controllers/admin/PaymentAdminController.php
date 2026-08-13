<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin payment gateway credentials (Cashfree sandbox / production).
 */
final class PaymentAdminController extends BaseController
{
    private const KEYS = [
        'cashfree_app_id',
        'cashfree_secret_key',
        'cashfree_env',
        'cashfree_webhook_url',
    ];

    public function showCashfree(array $params = []): void
    {
        $rows = $this->loadKeys(self::KEYS);
        $secret = (string) ($rows['cashfree_secret_key'] ?? '');
        $webhook = trim((string) ($rows['cashfree_webhook_url'] ?? ''));

        Response::jsonSuccess([
            'app_id' => (string) ($rows['cashfree_app_id'] ?? ''),
            'secret_key' => '',
            'secret_key_set' => $secret !== '',
            'env' => in_array(($rows['cashfree_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
                ? $rows['cashfree_env']
                : 'sandbox',
            'webhook_url' => $webhook,
            'suggested_webhook_url' => CashfreeClient::suggestedWebhookUrl(),
        ]);
    }

    public function updateCashfree(array $params = []): void
    {
        $input = $this->getJsonInput();

        $appId = trim((string) ($input['app_id'] ?? ''));
        $secretKey = trim((string) ($input['secret_key'] ?? ''));
        $env = trim((string) ($input['env'] ?? 'sandbox'));
        $webhookUrl = trim((string) ($input['webhook_url'] ?? ''));

        if (!in_array($env, ['sandbox', 'production'], true)) {
            Response::jsonError('Environment must be sandbox or production.', 422);
        }

        if ($webhookUrl !== '') {
            if (!filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
                Response::jsonError('Webhook URL must be a valid URL.', 422);
            }
            $host = strtolower((string) (parse_url($webhookUrl, PHP_URL_HOST) ?? ''));
            if ($host === 'localhost' || $host === '127.0.0.1') {
                Response::jsonError('Webhook URL must be a public domain (not localhost). Use your production API URL.', 422);
            }
            if (!str_contains($webhookUrl, '/payments/cashfree/webhook')) {
                Response::jsonError(
                    'Webhook URL should point to /api/payments/cashfree/webhook on your API domain.',
                    422
                );
            }
        }

        $this->upsertSetting('cashfree_app_id', $appId, 'payment');
        $this->upsertSetting('cashfree_env', $env, 'payment');
        $this->upsertSetting('cashfree_webhook_url', $webhookUrl, 'payment');

        // Keep existing secret if the field is left blank (masked on load).
        if ($secretKey !== '') {
            $this->upsertSetting('cashfree_secret_key', $secretKey, 'payment');
        }

        Response::jsonSuccess([
            'app_id' => $appId,
            'secret_key' => '',
            'secret_key_set' => $secretKey !== '' || $this->hasSecret(),
            'env' => $env,
            'webhook_url' => $webhookUrl,
            'suggested_webhook_url' => CashfreeClient::suggestedWebhookUrl(),
        ], 'Cashfree settings saved.');
    }

    /** @param list<string> $keys */
    private function loadKeys(array $keys): array
    {
        if ($keys === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare("SELECT `key`, value FROM settings WHERE `key` IN ({$placeholders})");
        $stmt->execute($keys);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['key']] = $row['value'];
        }
        return $out;
    }

    private function upsertSetting(string $key, string $value, string $group): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 0, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 0, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => $key,
            'value' => $value,
            'group' => $group,
            'value_update' => $value,
            'group_update' => $group,
        ]);
    }

    private function hasSecret(): bool
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => 'cashfree_secret_key']);
        $value = $stmt->fetchColumn();
        return is_string($value) && $value !== '';
    }
}

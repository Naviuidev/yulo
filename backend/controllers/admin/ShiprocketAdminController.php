<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin Shiprocket API credentials (email/password login token flow).
 */
final class ShiprocketAdminController extends BaseController
{
    private const KEYS = [
        'shiprocket_email',
        'shiprocket_password',
        'shiprocket_channel_id',
        'shiprocket_pickup_location',
        'shiprocket_enabled',
    ];

    public function show(array $params = []): void
    {
        $rows = $this->loadKeys(self::KEYS);
        $password = (string) ($rows['shiprocket_password'] ?? '');

        Response::jsonSuccess([
            'email' => (string) ($rows['shiprocket_email'] ?? ''),
            'password' => '',
            'password_set' => $password !== '',
            'channel_id' => (string) ($rows['shiprocket_channel_id'] ?? ''),
            'pickup_location' => (string) ($rows['shiprocket_pickup_location'] ?? ''),
            'enabled' => (($rows['shiprocket_enabled'] ?? '0') === '1' || ($rows['shiprocket_enabled'] ?? '') === 'true'),
        ]);
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();

        $email = strtolower(trim((string) ($input['email'] ?? '')));
        $password = trim((string) ($input['password'] ?? ''));
        $channelId = trim((string) ($input['channel_id'] ?? ''));
        $pickup = trim((string) ($input['pickup_location'] ?? ''));
        $enabled = !empty($input['enabled']);

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::jsonError('Enter a valid Shiprocket account email.', 422);
        }

        $this->upsertSetting('shiprocket_email', $email, 'shipping');
        $this->upsertSetting('shiprocket_channel_id', $channelId, 'shipping');
        $this->upsertSetting('shiprocket_pickup_location', $pickup, 'shipping');
        $this->upsertSetting('shiprocket_enabled', $enabled ? '1' : '0', 'shipping');

        // Keep existing password if left blank.
        if ($password !== '') {
            $this->upsertSetting('shiprocket_password', $password, 'shipping');
        }

        Response::jsonSuccess([
            'email' => $email,
            'password' => '',
            'password_set' => $password !== '' || $this->hasPassword(),
            'channel_id' => $channelId,
            'pickup_location' => $pickup,
            'enabled' => $enabled,
        ], 'Shiprocket settings saved.');
    }

    /** Optional: verify login credentials against Shiprocket. */
    public function testConnection(array $params = []): void
    {
        $client = new ShiprocketClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Save Shiprocket email and password first.', 422);
        }

        $result = $client->login(true);
        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'Shiprocket login failed.', 422, $result['data'] ?? []);
        }

        Response::jsonSuccess([
            'connected' => true,
            'token_preview' => substr((string) ($result['token'] ?? ''), 0, 12) . '…',
        ], 'Shiprocket connection successful.');
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

    private function hasPassword(): bool
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => 'shiprocket_password']);
        $value = $stmt->fetchColumn();
        return is_string($value) && $value !== '';
    }
}

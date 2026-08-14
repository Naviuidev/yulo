<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin WhatsApp floating button settings for the storefront.
 */
final class WhatsAppAdminController extends BaseController
{
    private const KEYS = [
        'whatsapp_enabled',
        'whatsapp_number',
        'whatsapp_position',
        'whatsapp_prefill',
    ];

    private const POSITIONS = ['bottom-left', 'bottom-right'];

    public function show(array $params = []): void
    {
        Response::jsonSuccess($this->payload());
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();

        $enabled = !empty($input['enabled']) && $input['enabled'] !== '0' && $input['enabled'] !== false;
        $numberRaw = trim((string) ($input['number'] ?? ''));
        $position = trim((string) ($input['position'] ?? 'bottom-left'));
        $prefill = trim((string) ($input['prefill'] ?? ''));

        if (!in_array($position, self::POSITIONS, true)) {
            Response::jsonError('Position must be bottom-left or bottom-right.', 422);
        }

        $digits = preg_replace('/\D+/', '', $numberRaw) ?? '';

        if ($enabled) {
            if ($digits === '') {
                Response::jsonError('WhatsApp number is required when the icon is turned on.', 422);
            }
            if (strlen($digits) < 10 || strlen($digits) > 15) {
                Response::jsonError('Enter a valid WhatsApp number with country code (e.g. +91 77990 56684).', 422);
            }
        }

        $this->upsertSetting('whatsapp_enabled', $enabled ? '1' : '0', true);
        $this->upsertSetting('whatsapp_number', $digits, true);
        $this->upsertSetting('whatsapp_position', $position, true);
        $this->upsertSetting('whatsapp_prefill', $prefill, true);

        Response::jsonSuccess($this->payload(), 'WhatsApp settings saved.');
    }

    private function payload(): array
    {
        $rows = $this->loadKeys(self::KEYS);
        $digits = preg_replace('/\D+/', '', (string) ($rows['whatsapp_number'] ?? '')) ?? '';
        $position = (string) ($rows['whatsapp_position'] ?? 'bottom-left');
        if (!in_array($position, self::POSITIONS, true)) {
            $position = 'bottom-left';
        }

        return [
            'enabled' => (($rows['whatsapp_enabled'] ?? '0') === '1'),
            'number' => $digits,
            'display_number' => $digits !== '' ? $this->formatDisplay($digits) : '',
            'position' => $position,
            'prefill' => (string) ($rows['whatsapp_prefill'] ?? ''),
            'positions' => self::POSITIONS,
        ];
    }

    private function formatDisplay(string $digits): string
    {
        if (str_starts_with($digits, '91') && strlen($digits) === 12) {
            return '+91 ' . substr($digits, 2, 5) . ' ' . substr($digits, 7);
        }
        return '+' . $digits;
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

    private function upsertSetting(string $key, string $value, bool $isPublic): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, :is_public, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = :is_public_update, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => $key,
            'value' => $value,
            'group' => 'whatsapp',
            'is_public' => $isPublic ? 1 : 0,
            'value_update' => $value,
            'group_update' => 'whatsapp',
            'is_public_update' => $isPublic ? 1 : 0,
        ]);
    }
}

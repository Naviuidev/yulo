<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

/** Public WhatsApp floating button config for the storefront. */
final class WhatsAppController extends BaseController
{
    private const POSITIONS = ['bottom-left', 'bottom-right'];

    public function show(array $params = []): void
    {
        $keys = ['whatsapp_enabled', 'whatsapp_number', 'whatsapp_position', 'whatsapp_prefill'];
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare("SELECT `key`, value FROM settings WHERE `key` IN ({$placeholders})");
        $stmt->execute($keys);
        $rows = [];
        foreach ($stmt->fetchAll() as $row) {
            $rows[$row['key']] = $row['value'];
        }

        $enabled = (($rows['whatsapp_enabled'] ?? '0') === '1');
        $digits = preg_replace('/\D+/', '', (string) ($rows['whatsapp_number'] ?? '')) ?? '';
        $position = (string) ($rows['whatsapp_position'] ?? 'bottom-left');
        if (!in_array($position, self::POSITIONS, true)) {
            $position = 'bottom-left';
        }

        if (!$enabled || $digits === '') {
            Response::jsonSuccess([
                'enabled' => false,
                'number' => '',
                'position' => $position,
                'prefill' => '',
            ]);
            return;
        }

        $prefill = (string) ($rows['whatsapp_prefill'] ?? '');
        $display = str_starts_with($digits, '91') && strlen($digits) === 12
            ? '+91 ' . substr($digits, 2, 5) . ' ' . substr($digits, 7)
            : '+' . $digits;

        Response::jsonSuccess([
            'enabled' => true,
            'number' => $digits,
            'display_number' => $display,
            'position' => $position,
            'prefill' => $prefill,
            'url' => 'https://wa.me/' . $digits . ($prefill !== '' ? '?text=' . rawurlencode($prefill) : ''),
        ]);
    }
}

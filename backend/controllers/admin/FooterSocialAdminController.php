<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin footer social links (Instagram, Facebook, etc.).
 */
final class FooterSocialAdminController extends BaseController
{
    private const PLATFORMS = [
        'instagram' => ['label' => 'Instagram', 'icon' => 'bi-instagram'],
        'facebook' => ['label' => 'Facebook', 'icon' => 'bi-facebook'],
        'youtube' => ['label' => 'YouTube', 'icon' => 'bi-youtube'],
        'linkedin' => ['label' => 'LinkedIn', 'icon' => 'bi-linkedin'],
        'pinterest' => ['label' => 'Pinterest', 'icon' => 'bi-pinterest'],
        'tiktok' => ['label' => 'TikTok', 'icon' => 'bi-tiktok'],
        'whatsapp' => ['label' => 'WhatsApp', 'icon' => 'bi-whatsapp'],
        'telegram' => ['label' => 'Telegram', 'icon' => 'bi-telegram'],
    ];

    public function show(array $params = []): void
    {
        Response::jsonSuccess([
            'items' => $this->loadItems(),
            'platforms' => $this->platformsList(),
        ]);
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();
        $raw = $input['items'] ?? [];
        if (!is_array($raw)) {
            Response::jsonError('Items must be a list.', 422);
        }

        $items = [];
        foreach ($raw as $row) {
            if (!is_array($row)) {
                continue;
            }
            $platform = strtolower(trim((string) ($row['platform'] ?? '')));
            $url = trim((string) ($row['url'] ?? ''));
            if (!isset(self::PLATFORMS[$platform])) {
                Response::jsonError('Unsupported social platform: ' . $platform, 422);
            }
            if ($url === '' || !filter_var($url, FILTER_VALIDATE_URL)) {
                Response::jsonError('Each social account needs a valid link (https://…).', 422);
            }
            $meta = self::PLATFORMS[$platform];
            $id = trim((string) ($row['id'] ?? ''));
            if ($id === '') {
                $id = $platform . '-' . substr(bin2hex(random_bytes(4)), 0, 8);
            }
            $items[] = [
                'id' => $id,
                'platform' => $platform,
                'label' => $meta['label'],
                'icon' => $meta['icon'],
                'url' => $url,
            ];
        }

        $json = json_encode(array_values($items), JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            Response::jsonError('Could not save social links.', 500);
        }

        $this->upsertSetting('footer_socials', $json);

        Response::jsonSuccess([
            'items' => $items,
            'platforms' => $this->platformsList(),
        ], 'Footer social connects saved.');
    }

    private function loadItems(): array
    {
        $stmt = $this->db->prepare("SELECT value FROM settings WHERE `key` = 'footer_socials' LIMIT 1");
        $stmt->execute();
        $value = $stmt->fetchColumn();
        if (!is_string($value) || $value === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return [];
        }
        $out = [];
        foreach ($decoded as $row) {
            if (!is_array($row)) {
                continue;
            }
            $platform = strtolower((string) ($row['platform'] ?? ''));
            if (!isset(self::PLATFORMS[$platform])) {
                continue;
            }
            $meta = self::PLATFORMS[$platform];
            $url = trim((string) ($row['url'] ?? ''));
            if ($url === '') {
                continue;
            }
            $out[] = [
                'id' => (string) ($row['id'] ?? ($platform . '-' . count($out))),
                'platform' => $platform,
                'label' => $meta['label'],
                'icon' => $meta['icon'],
                'url' => $url,
            ];
        }
        return $out;
    }

    private function platformsList(): array
    {
        $list = [];
        foreach (self::PLATFORMS as $id => $meta) {
            $list[] = [
                'id' => $id,
                'label' => $meta['label'],
                'icon' => $meta['icon'],
            ];
        }
        return $list;
    }

    private function upsertSetting(string $key, string $value): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 1, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 1, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => $key,
            'value' => $value,
            'group' => 'social',
            'value_update' => $value,
            'group_update' => 'social',
        ]);
    }
}

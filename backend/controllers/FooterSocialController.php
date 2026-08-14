<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

/** Public footer social links for the storefront. */
final class FooterSocialController extends BaseController
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

    public function index(array $params = []): void
    {
        $stmt = $this->db->prepare("SELECT value FROM settings WHERE `key` = 'footer_socials' LIMIT 1");
        $stmt->execute();
        $value = $stmt->fetchColumn();

        $items = [];
        if (is_string($value) && $value !== '') {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                foreach ($decoded as $row) {
                    if (!is_array($row)) {
                        continue;
                    }
                    $platform = strtolower((string) ($row['platform'] ?? ''));
                    if (!isset(self::PLATFORMS[$platform])) {
                        continue;
                    }
                    $url = trim((string) ($row['url'] ?? ''));
                    if ($url === '') {
                        continue;
                    }
                    $meta = self::PLATFORMS[$platform];
                    $items[] = [
                        'id' => (string) ($row['id'] ?? $platform),
                        'platform' => $platform,
                        'label' => $meta['label'],
                        'icon' => $meta['icon'],
                        'url' => $url,
                    ];
                }
            }
        }

        Response::jsonSuccess(['items' => $items]);
    }
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class SettingsController extends BaseController
{
    public function publicSettings(array $params = []): void
    {
        $stmt = $this->db->prepare('SELECT `key`, value, `group` FROM settings WHERE is_public = 1');
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $settings = [];
        foreach ($rows as $row) {
            $settings[$row['group']][$row['key']] = $row['value'];
        }

        $bannerStmt = $this->db->prepare(
            'SELECT id, title, image, link, position FROM banners WHERE status = :status ORDER BY sort_order ASC'
        );
        $bannerStmt->execute(['status' => 'active']);

        Response::jsonSuccess([
            'settings' => $settings,
            'banners' => $bannerStmt->fetchAll(),
        ]);
    }
}

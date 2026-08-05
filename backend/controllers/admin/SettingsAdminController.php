<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class SettingsAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM settings ORDER BY `group`, `key`');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();
        $settings = $input['settings'] ?? [];

        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, :is_public, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, is_public = :is_public_update, updated_at = NOW()'
        );

        foreach ($settings as $setting) {
            $stmt->execute([
                'key' => $setting['key'],
                'value' => $setting['value'],
                'group' => $setting['group'] ?? 'general',
                'is_public' => !empty($setting['is_public']) ? 1 : 0,
                'value_update' => $setting['value'],
                'is_public_update' => !empty($setting['is_public']) ? 1 : 0,
            ]);
        }

        Response::jsonSuccess(null, 'Settings updated.');
    }
}

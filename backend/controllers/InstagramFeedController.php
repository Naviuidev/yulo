<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class InstagramFeedController extends BaseController
{
    private const SETTING_KEY = 'instagram_feed';
    private const CACHE_SECONDS = 21600; // 6 hours

    public function show(array $params = []): void
    {
        $config = $this->loadConfig();
        if (empty($config['enabled'])) {
            Response::jsonSuccess([
                'enabled' => false,
                'handle' => $config['handle'] ?? 'yulofashion',
                'profile_url' => $config['profile_url'] ?? '',
                'items' => [],
            ]);
        }

        // Auto-refresh from Graph API when configured
        if (($config['feed_source'] ?? '') === 'api') {
            $config = $this->maybeRefreshFromApi($config);
        }

        $max = max(1, min(24, (int) ($config['max_posts'] ?? 6)));
        $items = [];
        foreach (array_slice($config['items'] ?? [], 0, $max) as $row) {
            if (!is_array($row)) {
                continue;
            }
            $image = trim((string) ($row['image_url'] ?? ''));
            if ($image === '') {
                continue;
            }
            $productSlug = trim((string) ($row['product_slug'] ?? ''));
            $permalink = trim((string) ($row['permalink'] ?? ''));
            $href = $permalink;
            if ($productSlug !== '') {
                $href = '/product/' . ltrim($productSlug, '/');
            } elseif ($href === '') {
                $href = (string) ($config['profile_url'] ?? 'https://www.instagram.com/');
            }

            $items[] = [
                'id' => (string) ($row['id'] ?? count($items)),
                'image_url' => $image,
                'permalink' => $href,
                'caption' => (string) ($row['caption'] ?? ''),
                'product_id' => $row['product_id'] ?? null,
                'external' => str_starts_with($href, 'http'),
            ];
        }

        $handle = ltrim((string) ($config['handle'] ?? 'yulofashion'), '@');

        Response::jsonSuccess([
            'enabled' => true,
            'handle' => $handle,
            'profile_url' => (string) ($config['profile_url'] ?? ('https://www.instagram.com/' . $handle . '/')),
            'items' => $items,
            'last_synced_at' => $config['last_synced_at'] ?? null,
        ]);
    }

    /** @param array<string,mixed> $config @return array<string,mixed> */
    private function maybeRefreshFromApi(array $config): array
    {
        $token = trim((string) ($config['access_token'] ?? ''));
        $igUserId = trim((string) ($config['ig_user_id'] ?? ''));
        if ($token === '' || $igUserId === '') {
            return $config;
        }

        $items = is_array($config['items'] ?? null) ? $config['items'] : [];
        $needsSync = count($items) === 0;
        $last = (string) ($config['last_synced_at'] ?? '');
        if (!$needsSync && $last !== '') {
            $ts = strtotime($last);
            if ($ts !== false && (time() - $ts) > self::CACHE_SECONDS) {
                $needsSync = true;
            }
        } elseif (!$needsSync && $last === '') {
            $needsSync = true;
        }

        if (!$needsSync) {
            return $config;
        }

        $client = new InstagramGraphClient();
        $result = $client->fetchMedia($igUserId, $token, (int) ($config['max_posts'] ?? 12));
        if (!$result['ok']) {
            // Keep previous items if any; just record error
            $config['last_sync_error'] = $result['error'] ?? 'Sync failed';
            $this->saveConfig($config);
            return $config;
        }

        $config['items'] = $result['items'];
        $config['last_synced_at'] = date('c');
        $config['last_sync_error'] = null;
        $this->saveConfig($config);
        return $config;
    }

    /** @param array<string,mixed> $config */
    private function saveConfig(array $config): void
    {
        $json = json_encode($config, JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            return;
        }
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 1, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 1, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => self::SETTING_KEY,
            'value' => $json,
            'group' => 'social',
            'value_update' => $json,
            'group_update' => 'social',
        ]);
    }

    /** @return array<string,mixed> */
    private function loadConfig(): array
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => self::SETTING_KEY]);
        $value = $stmt->fetchColumn();
        if (!is_string($value) || $value === '') {
            return [
                'enabled' => true,
                'handle' => 'yulofashion',
                'profile_url' => 'https://www.instagram.com/yulofashion/',
                'max_posts' => 6,
                'items' => [],
                'feed_source' => 'manual',
            ];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }
}

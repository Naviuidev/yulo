<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin Instagram feed for homepage @handle section.
 */
final class InstagramFeedAdminController extends BaseController
{
    private const SETTING_KEY = 'instagram_feed';

    public function show(array $params = []): void
    {
        Response::jsonSuccess($this->maskSecrets($this->loadRaw()));
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();
        $existing = $this->loadRaw();
        $config = $this->buildConfigFromInput($input, $existing);

        $this->saveConfig($config);

        // Auto-sync when API mode is selected and credentials exist
        if (($config['feed_source'] ?? '') === 'api'
            && ($config['ig_user_id'] ?? '') !== ''
            && ($config['access_token'] ?? '') !== ''
        ) {
            $synced = $this->syncFromApi($config);
            if ($synced['ok']) {
                Response::jsonSuccess(
                    $this->maskSecrets($synced['config']),
                    'Instagram feed saved and synced (' . count($synced['config']['items']) . ' posts).'
                );
            }
            // Still save settings, but report sync failure clearly
            Response::jsonSuccess(
                array_merge($this->maskSecrets($config), [
                    'sync_error' => $synced['error'] ?? 'Sync failed',
                ]),
                'Settings saved, but Instagram sync failed: ' . ($synced['error'] ?? 'Unknown error')
            );
        }

        Response::jsonSuccess($this->maskSecrets($config), 'Instagram feed settings saved.');
    }

    public function sync(array $params = []): void
    {
        $raw = $this->loadRaw();
        $input = $this->getJsonInput();
        $config = $this->buildConfigFromInput($input ?: [], $raw);
        $config['feed_source'] = 'api';

        if (($config['ig_user_id'] ?? '') === '' || ($config['access_token'] ?? '') === '') {
            Response::jsonError('Save App credentials first: Instagram User ID and Access token.', 422);
        }

        $this->saveConfig($config);

        $synced = $this->syncFromApi($config);
        if (!$synced['ok']) {
            Response::jsonError($synced['error'] ?? 'Instagram sync failed.', 422);
        }

        Response::jsonSuccess(
            $this->maskSecrets($synced['config']),
            'Synced ' . count($synced['config']['items']) . ' posts from Instagram.'
        );
    }

    /**
     * @param array<string,mixed> $input
     * @param array<string,mixed> $existing
     * @return array<string,mixed>
     */
    private function buildConfigFromInput(array $input, array $existing): array
    {
        $handle = ltrim(trim((string) ($input['handle'] ?? $existing['handle'])), '@');
        $profileUrl = trim((string) ($input['profile_url'] ?? ''));
        if ($profileUrl === '' && $handle !== '') {
            $profileUrl = 'https://www.instagram.com/' . $handle . '/';
        }
        if ($profileUrl !== '' && !filter_var($profileUrl, FILTER_VALIDATE_URL)) {
            Response::jsonError('Profile URL must be a valid link.', 422);
        }

        $feedSource = (string) ($input['feed_source'] ?? 'manual');
        if (!in_array($feedSource, ['manual', 'api'], true)) {
            $feedSource = 'manual';
        }

        $maxPosts = max(1, min(24, (int) ($input['max_posts'] ?? 6)));

        $accessToken = trim((string) ($input['access_token'] ?? ''));
        if ($accessToken === '' || str_contains($accessToken, '•')) {
            $accessToken = (string) ($existing['access_token'] ?? '');
        }
        $accessToken = (new InstagramGraphClient())->normalizeToken($accessToken);

        $items = [];
        $rawItems = $input['items'] ?? $existing['items'] ?? [];
        if (!is_array($rawItems)) {
            Response::jsonError('Feed items must be a list.', 422);
        }

        // In API mode, keep previous items until sync replaces them (unless manual items sent intentionally)
        if ($feedSource === 'manual' || array_key_exists('items', $input)) {
            foreach ($rawItems as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $image = trim((string) ($row['image_url'] ?? ''));
                if ($image === '') {
                    continue;
                }
                $permalink = trim((string) ($row['permalink'] ?? ''));
                if ($permalink !== '' && !filter_var($permalink, FILTER_VALIDATE_URL)) {
                    Response::jsonError('Each post permalink must be a valid URL when provided.', 422);
                }
                $productId = $row['product_id'] ?? null;
                $productId = ($productId === '' || $productId === null) ? null : (int) $productId;
                if ($productId !== null && $productId <= 0) {
                    $productId = null;
                }

                $id = trim((string) ($row['id'] ?? ''));
                if ($id === '') {
                    $id = 'ig-' . substr(bin2hex(random_bytes(4)), 0, 8);
                }

                $items[] = [
                    'id' => $id,
                    'image_url' => $image,
                    'permalink' => $permalink !== '' ? $permalink : null,
                    'caption' => trim((string) ($row['caption'] ?? '')),
                    'product_id' => $productId,
                    'product_name' => trim((string) ($row['product_name'] ?? '')),
                    'product_slug' => trim((string) ($row['product_slug'] ?? '')),
                    'source' => (string) ($row['source'] ?? 'manual'),
                ];
            }
        } else {
            $items = is_array($existing['items'] ?? null) ? $existing['items'] : [];
        }

        return [
            'enabled' => array_key_exists('enabled', $input) ? !empty($input['enabled']) : !empty($existing['enabled']),
            'handle' => $handle !== '' ? $handle : 'yulofashion',
            'profile_url' => $profileUrl,
            'ig_user_id' => trim((string) ($input['ig_user_id'] ?? $existing['ig_user_id'] ?? '')),
            'app_id' => trim((string) ($input['app_id'] ?? $existing['app_id'] ?? '')),
            'access_token' => $accessToken,
            'feed_source' => $feedSource,
            'max_posts' => $maxPosts,
            'items' => array_slice($items, 0, 24),
            'last_synced_at' => $existing['last_synced_at'] ?? null,
            'last_sync_error' => $existing['last_sync_error'] ?? null,
        ];
    }

    /**
     * @param array<string,mixed> $config
     * @return array{ok:bool,config?:array<string,mixed>,error?:string}
     */
    private function syncFromApi(array $config): array
    {
        $client = new InstagramGraphClient();
        $result = $client->fetchMedia(
            (string) ($config['ig_user_id'] ?? ''),
            (string) ($config['access_token'] ?? ''),
            (int) ($config['max_posts'] ?? 12)
        );

        if (!$result['ok']) {
            $config['last_sync_error'] = $result['error'] ?? 'Sync failed';
            $this->saveConfig($config);
            return ['ok' => false, 'error' => $result['error'] ?? 'Sync failed', 'config' => $config];
        }

        $config['items'] = $result['items'];
        $config['feed_source'] = 'api';
        $config['last_synced_at'] = date('c');
        $config['last_sync_error'] = null;
        $this->saveConfig($config);

        return ['ok' => true, 'config' => $config];
    }

    /** @param array<string,mixed> $config */
    private function saveConfig(array $config): void
    {
        $json = json_encode($config, JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            Response::jsonError('Could not save Instagram feed settings.', 500);
        }
        $this->upsertSetting(self::SETTING_KEY, $json);
    }

    /** @return array<string,mixed> */
    private function loadRaw(): array
    {
        $defaults = [
            'enabled' => true,
            'handle' => 'yulofashion',
            'profile_url' => 'https://www.instagram.com/yulofashion/',
            'ig_user_id' => '',
            'app_id' => '',
            'access_token' => '',
            'feed_source' => 'manual',
            'max_posts' => 6,
            'items' => [],
            'last_synced_at' => null,
            'last_sync_error' => null,
        ];

        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => self::SETTING_KEY]);
        $value = $stmt->fetchColumn();
        if (!is_string($value) || $value === '') {
            return $defaults;
        }

        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return $defaults;
        }

        $config = array_merge($defaults, $decoded);
        $config['items'] = is_array($config['items'] ?? null) ? array_values($config['items']) : [];
        return $config;
    }

    /** @param array<string,mixed> $config */
    private function maskSecrets(array $config): array
    {
        $token = (string) ($config['access_token'] ?? '');
        $config['token_set'] = $token !== '';
        $config['access_token'] = $token !== '' ? str_repeat('•', 12) : '';
        $config['item_count'] = count($config['items'] ?? []);
        return $config;
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

<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Single site favicon (URL or upload) for the storefront.
 * Draft is edited in admin; Publish pushes it live.
 */
final class FaviconAdminController extends BaseController
{
    private const DRAFT_KEY = 'favicon_url';
    private const PUBLISHED_KEY = 'favicon_published';
    private const GROUP = 'branding';

    public function show(array $params = []): void
    {
        Response::jsonSuccess($this->payload());
    }

    public function update(array $params = []): void
    {
        $input = $this->getJsonInput();
        $url = trim((string) ($input['url'] ?? $input['favicon_url'] ?? ''));

        if ($url === '') {
            Response::jsonError('Favicon URL is required.', 422);
        }

        if (!$this->isValidUrlOrPath($url)) {
            Response::jsonError('Enter a valid image URL or upload path.', 422);
        }

        $this->upsert(self::DRAFT_KEY, $url, false);
        Response::jsonSuccess($this->payload(), 'Favicon draft saved. Click Publish to go live.');
    }

    public function publish(array $params = []): void
    {
        $draft = $this->getSetting(self::DRAFT_KEY);
        if ($draft === '') {
            Response::jsonError('Add a favicon before publishing.', 422);
        }

        $this->upsert(self::PUBLISHED_KEY, $draft, true);
        Response::jsonSuccess($this->payload(), 'Favicon published to the website.');
    }

    public function destroy(array $params = []): void
    {
        $draft = $this->getSetting(self::DRAFT_KEY);
        $published = $this->getSetting(self::PUBLISHED_KEY);

        $this->upsert(self::DRAFT_KEY, '', false);
        $this->upsert(self::PUBLISHED_KEY, '', true);

        foreach ([$draft, $published] as $path) {
            if (
                $path !== ''
                && (str_starts_with($path, '/uploads/') || str_starts_with($path, 'uploads/'))
            ) {
                $uploader = new Uploader();
                $uploader->delete(ltrim($path, '/'));
            }
        }

        Response::jsonSuccess($this->payload(), 'Favicon removed.');
    }

    public function uploadImage(array $params = []): void
    {
        if (empty($_FILES['image'])) {
            Response::jsonError('No image file uploaded.', 422);
        }

        $uploader = new Uploader();
        $result = $uploader->upload($_FILES['image'], 'favicon');

        if (!($result['success'] ?? false)) {
            Response::jsonError($result['message'] ?? 'Upload failed.', 422);
        }

        $path = '/' . ltrim((string) $result['path'], '/');
        $this->upsert(self::DRAFT_KEY, $path, false);

        Response::jsonSuccess([
            'path' => $path,
            'url' => $path,
            ...$this->payload(),
        ], 'Favicon uploaded as draft. Click Publish to go live.');
    }

    private function payload(): array
    {
        $draft = $this->getSetting(self::DRAFT_KEY);
        $published = $this->getSetting(self::PUBLISHED_KEY);
        $publishedAt = $this->getSettingUpdatedAt(self::PUBLISHED_KEY);

        return [
            'url' => $draft !== '' ? $draft : null,
            'draft_url' => $draft !== '' ? $draft : null,
            'published_url' => $published !== '' ? $published : null,
            'is_published' => $published !== '' && $published === $draft,
            'has_draft' => $draft !== '',
            'has_published' => $published !== '',
            'published_at' => $publishedAt,
        ];
    }

    private function getSetting(string $key): string
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        return trim((string) ($stmt->fetchColumn() ?: ''));
    }

    private function getSettingUpdatedAt(string $key): ?string
    {
        $stmt = $this->db->prepare('SELECT updated_at FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        $value = $stmt->fetchColumn();
        return $value ? (string) $value : null;
    }

    private function upsert(string $key, string $value, bool $isPublic): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, :is_public, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update,
               is_public = :is_public_update, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => $key,
            'value' => $value,
            'group' => self::GROUP,
            'is_public' => $isPublic ? 1 : 0,
            'value_update' => $value,
            'group_update' => self::GROUP,
            'is_public_update' => $isPublic ? 1 : 0,
        ]);
    }

    private function isValidUrlOrPath(string $url): bool
    {
        if (preg_match('#^https?://#i', $url)) {
            return (bool) filter_var($url, FILTER_VALIDATE_URL);
        }
        return (bool) preg_match('#^/?uploads/.+#', $url);
    }
}

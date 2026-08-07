<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class BannerAdminController extends BaseController
{
    private const MAX_HOME_ACTIVE = 3;

    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM banners ORDER BY sort_order ASC, id ASC');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->normalizeInput($this->getJsonInput());

        if ($input['image'] === '') {
            Response::jsonError('Image URL is required.', 422);
            return;
        }

        if (!$this->assertHomeLimit($input['position'], $input['status'])) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO banners (title, image, link, position, sort_order, status, created_at, updated_at)
             VALUES (:title, :image, :link, :position, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'title' => $input['title'],
            'image' => $input['image'],
            'link' => $input['link'],
            'position' => $input['position'],
            'sort_order' => $input['sort_order'],
            'status' => $input['status'],
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Banner created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->normalizeInput($this->getJsonInput());
        $id = (int) ($params['id'] ?? 0);

        if ($input['image'] === '') {
            Response::jsonError('Image URL is required.', 422);
            return;
        }

        if (!$this->assertHomeLimit($input['position'], $input['status'], $id)) {
            return;
        }

        $stmt = $this->db->prepare(
            'UPDATE banners SET title = :title, image = :image, link = :link, position = :position,
             sort_order = :sort_order, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'title' => $input['title'],
            'image' => $input['image'],
            'link' => $input['link'],
            'position' => $input['position'],
            'sort_order' => $input['sort_order'],
            'status' => $input['status'],
            'id' => $id,
        ]);

        Response::jsonSuccess(null, 'Banner updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM banners WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Banner deleted.');
    }

    /** @return array{title:?string,image:string,link:?string,position:string,sort_order:int,status:string} */
    private function normalizeInput(array $input): array
    {
        $image = trim((string) ($input['image'] ?? $input['image_url'] ?? ''));
        $link = trim((string) ($input['link'] ?? $input['link_url'] ?? ''));

        return [
            'title' => isset($input['title']) ? trim((string) $input['title']) : null,
            'image' => $image,
            'link' => $link !== '' ? $link : null,
            'position' => trim((string) ($input['position'] ?? 'home')) ?: 'home',
            'sort_order' => (int) ($input['sort_order'] ?? 0),
            'status' => (($input['status'] ?? 'active') === 'inactive') ? 'inactive' : 'active',
        ];
    }

    private function assertHomeLimit(string $position, string $status, ?int $excludeId = null): bool
    {
        if ($position !== 'home' || $status !== 'active') {
            return true;
        }

        $sql = 'SELECT COUNT(*) FROM banners WHERE position = :position AND status = :status';
        $bind = ['position' => 'home', 'status' => 'active'];

        if ($excludeId) {
            $sql .= ' AND id != :id';
            $bind['id'] = $excludeId;
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($bind);
        $count = (int) $stmt->fetchColumn();

        if ($count >= self::MAX_HOME_ACTIVE) {
            Response::jsonError(
                'Maximum ' . self::MAX_HOME_ACTIVE . ' active Home hero banners allowed.',
                422
            );
            return false;
        }

        return true;
    }
}

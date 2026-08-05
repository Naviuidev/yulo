<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class BannerAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM banners ORDER BY sort_order ASC');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO banners (title, image, link, position, sort_order, status, created_at, updated_at)
             VALUES (:title, :image, :link, :position, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'title' => $input['title'] ?? null,
            'image' => $input['image'],
            'link' => $input['link'] ?? null,
            'position' => $input['position'] ?? 'home',
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Banner created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE banners SET title = :title, image = :image, link = :link, position = :position,
             sort_order = :sort_order, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'title' => $input['title'] ?? null,
            'image' => $input['image'],
            'link' => $input['link'] ?? null,
            'position' => $input['position'] ?? 'home',
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Banner updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('DELETE FROM banners WHERE id = :id');
        $stmt->execute(['id' => $params['id']]);
        Response::jsonSuccess(null, 'Banner deleted.');
    }
}

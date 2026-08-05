<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class CategoryAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO categories (name, slug, parent_id, description, image, sort_order, status, created_at, updated_at)
             VALUES (:name, :slug, :parent_id, :description, :image, :sort_order, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'parent_id' => $input['parent_id'] ?? null,
            'description' => $input['description'] ?? null,
            'image' => $input['image'] ?? null,
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Category created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE categories SET name = :name, slug = :slug, parent_id = :parent_id, description = :description,
             image = :image, sort_order = :sort_order, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'parent_id' => $input['parent_id'] ?? null,
            'description' => $input['description'] ?? null,
            'image' => $input['image'] ?? null,
            'sort_order' => $input['sort_order'] ?? 0,
            'status' => $input['status'] ?? 'active',
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Category updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('UPDATE categories SET status = :status WHERE id = :id');
        $stmt->execute(['status' => 'inactive', 'id' => $params['id']]);
        Response::jsonSuccess(null, 'Category deactivated.');
    }
}

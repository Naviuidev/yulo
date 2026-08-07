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
        $id = (int) ($params['id'] ?? 0);

        $exists = $this->db->prepare('SELECT id FROM categories WHERE id = :id LIMIT 1');
        $exists->execute(['id' => $id]);
        if (!$exists->fetch()) {
            Response::jsonError('Category not found.', 404);
        }

        // Block delete when products still use this category
        $countStmt = $this->db->prepare(
            'SELECT COUNT(*) FROM products WHERE category_id = :id'
        );
        $countStmt->execute(['id' => $id]);
        $productCount = (int) $countStmt->fetchColumn();

        if ($productCount > 0) {
            $listStmt = $this->db->prepare(
                'SELECT id, name FROM products WHERE category_id = :id ORDER BY name ASC LIMIT 10'
            );
            $listStmt->execute(['id' => $id]);
            $products = $listStmt->fetchAll();

            Response::jsonError(
                "Cannot delete this category. Delete the {$productCount} associated product(s) first.",
                409,
                ['products' => $products, 'product_count' => $productCount],
                ['products' => $products, 'product_count' => $productCount]
            );
        }

        $this->db->prepare('UPDATE categories SET parent_id = NULL WHERE parent_id = :id')
            ->execute(['id' => $id]);

        $stmt = $this->db->prepare('DELETE FROM categories WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Response::jsonSuccess(null, 'Category deleted.');
    }

    public function uploadIcon(array $params = []): void
    {
        if (empty($_FILES['icon'])) {
            Response::jsonError('No icon file uploaded.', 422);
        }

        $uploader = new Uploader();
        $result = $uploader->upload($_FILES['icon'], 'categories');

        if (!($result['success'] ?? false)) {
            Response::jsonError($result['message'] ?? 'Upload failed.', 422);
        }

        Response::jsonSuccess([
            'path' => '/' . ltrim($result['path'], '/'),
            'url' => '/' . ltrim($result['path'], '/'),
        ], 'Icon uploaded.');
    }
}

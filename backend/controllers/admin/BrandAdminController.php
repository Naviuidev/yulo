<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class BrandAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->query('SELECT * FROM brands ORDER BY name ASC');
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'INSERT INTO brands (name, slug, logo, description, status, created_at, updated_at)
             VALUES (:name, :slug, :logo, :description, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'logo' => $input['logo'] ?? null,
            'description' => $input['description'] ?? null,
            'status' => $input['status'] ?? 'active',
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Brand created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE brands SET name = :name, slug = :slug, logo = :logo, description = :description, status = :status, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'logo' => $input['logo'] ?? null,
            'description' => $input['description'] ?? null,
            'status' => $input['status'] ?? 'active',
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Brand updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('UPDATE brands SET status = :status WHERE id = :id');
        $stmt->execute(['status' => 'inactive', 'id' => $params['id']]);
        Response::jsonSuccess(null, 'Brand deactivated.');
    }

    public function uploadLogo(array $params = []): void
    {
        if (empty($_FILES['logo']) && empty($_FILES['image'])) {
            Response::jsonError('No logo file uploaded.', 422);
        }

        $file = $_FILES['logo'] ?? $_FILES['image'];
        $uploader = new Uploader();
        $result = $uploader->upload($file, 'brands');

        if (!($result['success'] ?? false)) {
            Response::jsonError($result['message'] ?? 'Upload failed.', 422);
        }

        $path = '/' . ltrim((string) $result['path'], '/');
        Response::jsonSuccess(['path' => $path, 'url' => $path], 'Logo uploaded.');
    }
}

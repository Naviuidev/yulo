<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class BrandController extends BaseController
{
    public function index(array $params = []): void
    {
        $stmt = $this->db->prepare(
            "SELECT b.id, b.name, b.slug, b.logo, COUNT(p.id) as product_count
             FROM brands b
             LEFT JOIN products p ON p.brand_id = b.id AND p.status = 'active'
             WHERE b.status = 'active'
             GROUP BY b.id ORDER BY b.name ASC"
        );
        $stmt->execute();
        Response::jsonSuccess($stmt->fetchAll());
    }

    public function show(array $params): void
    {
        $stmt = $this->db->prepare('SELECT * FROM brands WHERE slug = :slug AND status = :status LIMIT 1');
        $stmt->execute(['slug' => $params['slug'], 'status' => 'active']);
        $brand = $stmt->fetch();

        if (!$brand) {
            Response::jsonError('Brand not found.', 404);
        }

        $pagination = Pagination::resolve();
        $productModel = new Product($this->db);
        $result = $productModel->list(['brand_id' => $brand['id']], $pagination['limit'], $pagination['offset']);

        Response::jsonSuccess([
            'brand' => $brand,
            'products' => $result['items'],
            'pagination' => Pagination::buildMeta($result['total'], $pagination['page'], $pagination['per_page']),
        ]);
    }
}

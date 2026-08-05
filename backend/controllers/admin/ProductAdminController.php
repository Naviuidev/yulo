<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ProductAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $search = $_GET['search'] ?? '';

        $where = '1=1';
        $bind = [];

        if ($search) {
            $where .= ' AND (p.name LIKE :search OR p.sku LIKE :search)';
            $bind['search'] = '%' . $search . '%';
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM products p WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT p.*, c.name as category_name, b.name as brand_name
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE {$where}
             ORDER BY p.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $productModel = new Product($this->db);
        $product = $productModel->findById((int) $params['id']);

        if (!$product) {
            Response::jsonError('Product not found.', 404);
        }

        $product['images'] = $productModel->getImages((int) $product['id']);
        $product['variants'] = $productModel->getVariants((int) $product['id']);

        Response::jsonSuccess($product);
    }

    public function store(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)->required('name')->required('slug')->required('price')->numeric('price');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $stmt = $this->db->prepare(
            'INSERT INTO products (name, slug, description, short_description, sku, price, sale_price, stock, category_id, brand_id, status, is_featured, created_at, updated_at)
             VALUES (:name, :slug, :description, :short_description, :sku, :price, :sale_price, :stock, :category_id, :brand_id, :status, :is_featured, NOW(), NOW())'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'description' => $input['description'] ?? null,
            'short_description' => $input['short_description'] ?? null,
            'sku' => $input['sku'] ?? null,
            'price' => $input['price'],
            'sale_price' => $input['sale_price'] ?? null,
            'stock' => $input['stock'] ?? 0,
            'category_id' => $input['category_id'] ?? null,
            'brand_id' => $input['brand_id'] ?? null,
            'status' => $input['status'] ?? 'active',
            'is_featured' => !empty($input['is_featured']) ? 1 : 0,
        ]);

        Response::jsonSuccess(['id' => (int) $this->db->lastInsertId()], 'Product created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();

        $stmt = $this->db->prepare(
            'UPDATE products SET name = :name, slug = :slug, description = :description, short_description = :short_description,
             sku = :sku, price = :price, sale_price = :sale_price, stock = :stock, category_id = :category_id, brand_id = :brand_id,
             status = :status, is_featured = :is_featured, updated_at = NOW() WHERE id = :id'
        );
        $stmt->execute([
            'name' => $input['name'],
            'slug' => $input['slug'],
            'description' => $input['description'] ?? null,
            'short_description' => $input['short_description'] ?? null,
            'sku' => $input['sku'] ?? null,
            'price' => $input['price'],
            'sale_price' => $input['sale_price'] ?? null,
            'stock' => $input['stock'] ?? 0,
            'category_id' => $input['category_id'] ?? null,
            'brand_id' => $input['brand_id'] ?? null,
            'status' => $input['status'] ?? 'active',
            'is_featured' => !empty($input['is_featured']) ? 1 : 0,
            'id' => $params['id'],
        ]);

        Response::jsonSuccess(null, 'Product updated.');
    }

    public function destroy(array $params): void
    {
        $stmt = $this->db->prepare('UPDATE products SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['status' => 'archived', 'id' => $params['id']]);
        Response::jsonSuccess(null, 'Product archived.');
    }

    public function bulkUpload(array $params = []): void
    {
        if (empty($_FILES['file'])) {
            Response::jsonError('CSV file is required.', 422);
        }

        $file = $_FILES['file'];
        $handle = fopen($file['tmp_name'], 'r');
        if (!$handle) {
            Response::jsonError('Failed to read file.', 400);
        }

        $header = fgetcsv($handle);
        $imported = 0;
        $errors = [];

        $stmt = $this->db->prepare(
            'INSERT INTO products (name, slug, sku, price, stock, category_id, status, created_at, updated_at)
             VALUES (:name, :slug, :sku, :price, :stock, :category_id, :status, NOW(), NOW())'
        );

        while (($row = fgetcsv($handle)) !== false) {
            $data = array_combine($header, $row);
            if (!$data) {
                continue;
            }

            try {
                $stmt->execute([
                    'name' => $data['name'] ?? '',
                    'slug' => $data['slug'] ?? strtolower(str_replace(' ', '-', $data['name'] ?? '')),
                    'sku' => $data['sku'] ?? null,
                    'price' => $data['price'] ?? 0,
                    'stock' => $data['stock'] ?? 0,
                    'category_id' => $data['category_id'] ?? null,
                    'status' => 'active',
                ]);
                $imported++;
            } catch (Throwable $e) {
                $errors[] = $data['name'] ?? 'Unknown row';
            }
        }

        fclose($handle);
        Response::jsonSuccess(['imported' => $imported, 'errors' => $errors], 'Bulk upload completed.');
    }
}

<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ProductAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $search = $_GET['search'] ?? '';

        $where = "p.status != 'archived'";
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

        $productModel = new Product($this->db);
        $items = $productModel->attachImages($stmt->fetchAll());

        Response::jsonPaginate($items, $total, $pagination['page'], $pagination['per_page']);
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
        $product['section_ids'] = $this->getSectionIds((int) $product['id']);

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

        $productId = (int) $this->db->lastInsertId();
        $this->syncImages($productId, $input['images'] ?? []);
        $this->syncSections($productId, $input['section_ids'] ?? []);

        Response::jsonSuccess(['id' => $productId], 'Product created.', 201);
    }

    public function update(array $params): void
    {
        $input = $this->getJsonInput();
        $productId = (int) $params['id'];

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
            'id' => $productId,
        ]);

        if (array_key_exists('images', $input)) {
            $this->syncImages($productId, $input['images'] ?? []);
        }

        if (array_key_exists('section_ids', $input)) {
            $this->syncSections($productId, $input['section_ids'] ?? []);
        }

        Response::jsonSuccess(null, 'Product updated.');
    }

    public function uploadImage(array $params = []): void
    {
        if (empty($_FILES['image'])) {
            Response::jsonError('No image file uploaded.', 422);
        }

        $uploader = new Uploader();
        $result = $uploader->upload($_FILES['image'], 'products');

        if (!($result['success'] ?? false)) {
            Response::jsonError($result['message'] ?? 'Upload failed.', 422);
        }

        Response::jsonSuccess([
            'path' => '/' . ltrim($result['path'], '/'),
            'url' => '/' . ltrim($result['path'], '/'),
        ], 'Image uploaded.');
    }

    /** Replace product images (max 3). Accepts string paths or { image_path } objects. */
    private function syncImages(int $productId, mixed $images): void
    {
        $this->db->prepare('DELETE FROM product_images WHERE product_id = :id')
            ->execute(['id' => $productId]);

        if (!is_array($images) || $images === []) {
            return;
        }

        $paths = [];
        foreach ($images as $image) {
            if (is_string($image)) {
                $path = trim($image);
            } elseif (is_array($image)) {
                $path = trim((string) ($image['image_path'] ?? $image['url'] ?? $image['path'] ?? ''));
            } else {
                $path = '';
            }
            if ($path !== '') {
                $paths[] = $path;
            }
            if (count($paths) >= 3) {
                break;
            }
        }

        if ($paths === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO product_images (product_id, image_path, is_primary, sort_order)
             VALUES (:product_id, :image_path, :is_primary, :sort_order)'
        );

        foreach ($paths as $index => $path) {
            $stmt->execute([
                'product_id' => $productId,
                'image_path' => $path,
                'is_primary' => $index === 0 ? 1 : 0,
                'sort_order' => $index + 1,
            ]);
        }
    }

    /** @return list<int> */
    private function getSectionIds(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT section_id FROM product_home_sections WHERE product_id = :product_id'
        );
        $stmt->execute(['product_id' => $productId]);
        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    private function syncSections(int $productId, mixed $sectionIds): void
    {
        $this->db->prepare('DELETE FROM product_home_sections WHERE product_id = :id')
            ->execute(['id' => $productId]);

        if (!is_array($sectionIds) || $sectionIds === []) {
            return;
        }

        $ids = [];
        foreach ($sectionIds as $sid) {
            $id = (int) $sid;
            if ($id > 0) {
                $ids[$id] = true;
            }
        }

        if ($ids === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO product_home_sections (product_id, section_id) VALUES (:product_id, :section_id)'
        );
        foreach (array_keys($ids) as $sectionId) {
            $stmt->execute([
                'product_id' => $productId,
                'section_id' => $sectionId,
            ]);
        }
    }

    public function destroy(array $params): void
    {
        $id = (int) ($params['id'] ?? 0);

        $exists = $this->db->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
        $exists->execute(['id' => $id]);
        if (!$exists->fetch()) {
            Response::jsonError('Product not found.', 404);
        }

        // Permanently remove related rows, then the product (not soft-inactive/archived)
        $related = [
            'product_images',
            'product_variants',
            'product_home_sections',
            'cart_items',
            'wishlists',
            'compare_lists',
            'reviews',
            'recently_viewed',
            'inventory_logs',
        ];

        foreach ($related as $table) {
            $this->db->prepare("DELETE FROM {$table} WHERE product_id = :id")->execute(['id' => $id]);
        }

        // order_items retain price/qty; FK would block delete, so relax briefly
        $this->db->exec('SET FOREIGN_KEY_CHECKS=0');
        $this->db->prepare('DELETE FROM products WHERE id = :id')->execute(['id' => $id]);
        $this->db->exec('SET FOREIGN_KEY_CHECKS=1');

        Response::jsonSuccess(null, 'Product deleted.');
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

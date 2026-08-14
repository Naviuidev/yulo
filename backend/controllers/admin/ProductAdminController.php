<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class ProductAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        SchemaGuard::ensureProductCommerceOptions($this->db);
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
            "SELECT p.*, c.name as category_name, b.name as brand_name,
                    " . Review::productSelectSql('p') . "
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
        $items = Review::enrichProducts($productModel->attachImages($stmt->fetchAll()));

        Response::jsonPaginate($items, $total, $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        SchemaGuard::ensureProductCommerceOptions($this->db);
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
        $input = $this->normalizeProductInput($this->getJsonInput());

        $validator = Validator::make($input)->required('name')->required('slug')->required('price')->numeric('price');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        if ($this->slugExists((string) $input['slug'])) {
            Response::jsonError('Validation failed.', 422, ['slug' => ['Slug already exists.']]);
        }

        SchemaGuard::ensureHomeSections($this->db);
        SchemaGuard::ensureProductCommerceOptions($this->db);

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                'INSERT INTO products (name, slug, description, short_description, sku, price, sale_price, gst_applicable,
                 custom_shipping, shipping_price, has_color_variants, colors, size_option, sizes,
                 stock, category_id, brand_id, status, is_featured, created_at, updated_at)
                 VALUES (:name, :slug, :description, :short_description, :sku, :price, :sale_price, :gst_applicable,
                 :custom_shipping, :shipping_price, :has_color_variants, :colors, :size_option, :sizes,
                 :stock, :category_id, :brand_id, :status, :is_featured, NOW(), NOW())'
            );
            $stmt->execute([
                'name' => $input['name'],
                'slug' => $input['slug'],
                'description' => $input['description'],
                'short_description' => $input['short_description'],
                'sku' => $input['sku'],
                'price' => $input['price'],
                'sale_price' => $input['sale_price'],
                'gst_applicable' => $input['gst_applicable'],
                'custom_shipping' => $input['custom_shipping'],
                'shipping_price' => $input['shipping_price'],
                'has_color_variants' => $input['has_color_variants'],
                'colors' => $input['colors'],
                'size_option' => $input['size_option'],
                'sizes' => $input['sizes'],
                'stock' => $input['stock'],
                'category_id' => $input['category_id'],
                'brand_id' => $input['brand_id'],
                'status' => $input['status'],
                'is_featured' => $input['is_featured'],
            ]);

            $productId = (int) $this->db->lastInsertId();
            $this->syncImages($productId, $input['images'] ?? []);
            $this->syncSections($productId, $input['section_ids'] ?? []);

            $this->db->commit();
            Response::jsonSuccess(['id' => $productId], 'Product created.', 201);
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->handleProductDbError($e);
        }
    }

    public function update(array $params): void
    {
        $input = $this->normalizeProductInput($this->getJsonInput());
        $productId = (int) $params['id'];

        $exists = $this->db->prepare('SELECT id FROM products WHERE id = :id LIMIT 1');
        $exists->execute(['id' => $productId]);
        if (!$exists->fetch()) {
            Response::jsonError('Product not found.', 404);
        }

        if ($this->slugExists((string) $input['slug'], $productId)) {
            Response::jsonError('Validation failed.', 422, ['slug' => ['Slug already exists.']]);
        }

        SchemaGuard::ensureHomeSections($this->db);
        SchemaGuard::ensureProductCommerceOptions($this->db);

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare(
                'UPDATE products SET name = :name, slug = :slug, description = :description, short_description = :short_description,
                 sku = :sku, price = :price, sale_price = :sale_price, gst_applicable = :gst_applicable,
                 custom_shipping = :custom_shipping, shipping_price = :shipping_price,
                 has_color_variants = :has_color_variants, colors = :colors, size_option = :size_option, sizes = :sizes,
                 stock = :stock, category_id = :category_id, brand_id = :brand_id,
                 status = :status, is_featured = :is_featured, updated_at = NOW() WHERE id = :id'
            );
            $stmt->execute([
                'name' => $input['name'],
                'slug' => $input['slug'],
                'description' => $input['description'],
                'short_description' => $input['short_description'],
                'sku' => $input['sku'],
                'price' => $input['price'],
                'sale_price' => $input['sale_price'],
                'gst_applicable' => $input['gst_applicable'],
                'custom_shipping' => $input['custom_shipping'],
                'shipping_price' => $input['shipping_price'],
                'has_color_variants' => $input['has_color_variants'],
                'colors' => $input['colors'],
                'size_option' => $input['size_option'],
                'sizes' => $input['sizes'],
                'stock' => $input['stock'],
                'category_id' => $input['category_id'],
                'brand_id' => $input['brand_id'],
                'status' => $input['status'],
                'is_featured' => $input['is_featured'],
                'id' => $productId,
            ]);

            if (array_key_exists('images', $input)) {
                $this->syncImages($productId, $input['images'] ?? []);
            }

            if (array_key_exists('section_ids', $input)) {
                $this->syncSections($productId, $input['section_ids'] ?? []);
            }

            $this->db->commit();
            Response::jsonSuccess(null, 'Product updated.');
        } catch (PDOException $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            $this->handleProductDbError($e);
        }
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
        try {
            SchemaGuard::ensureHomeSections($this->db);
            $stmt = $this->db->prepare(
                'SELECT section_id FROM product_home_sections WHERE product_id = :product_id'
            );
            $stmt->execute(['product_id' => $productId]);
            return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
        } catch (Throwable) {
            return [];
        }
    }

    private function syncSections(int $productId, mixed $sectionIds): void
    {
        SchemaGuard::ensureHomeSections($this->db);

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

        // Keep only section IDs that still exist (avoids FK 500s from stale admin UI state).
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $check = $this->db->prepare("SELECT id FROM home_sections WHERE id IN ({$placeholders})");
        $check->execute(array_keys($ids));
        $validIds = array_map('intval', $check->fetchAll(PDO::FETCH_COLUMN));

        if ($validIds === []) {
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO product_home_sections (product_id, section_id) VALUES (:product_id, :section_id)'
        );
        foreach ($validIds as $sectionId) {
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

        SchemaGuard::ensureHomeSections($this->db);

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
            try {
                $this->db->prepare("DELETE FROM {$table} WHERE product_id = :id")->execute(['id' => $id]);
            } catch (PDOException) {
                // Table may not exist on older deployments.
            }
        }

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

    private function normalizeProductInput(array $input): array
    {
        $short = isset($input['short_description']) ? trim((string) $input['short_description']) : '';
        if (mb_strlen($short) > 500) {
            $short = mb_substr($short, 0, 500);
        }

        $status = (string) ($input['status'] ?? 'active');
        if (!in_array($status, ['active', 'inactive', 'archived'], true)) {
            $status = 'active';
        }

        $customShipping = !empty($input['custom_shipping']) ? 1 : 0;
        $hasColors = !empty($input['has_color_variants']) ? 1 : 0;
        $sizes = $this->normalizeSizes($input['sizes'] ?? $input['size_option'] ?? []);
        $sizeOption = $sizes === [] ? 'none' : $sizes[0];

        return [
            'name' => trim((string) ($input['name'] ?? '')),
            'slug' => trim((string) ($input['slug'] ?? '')),
            'description' => $this->nullableString($input['description'] ?? null),
            'short_description' => $short !== '' ? $short : null,
            'sku' => $this->nullableString($input['sku'] ?? null),
            'price' => $input['price'] ?? null,
            'sale_price' => $this->nullableNumber($input['sale_price'] ?? null),
            'stock' => (int) ($input['stock'] ?? 0),
            'category_id' => $this->nullableInt($input['category_id'] ?? null),
            'brand_id' => $this->nullableInt($input['brand_id'] ?? null),
            'status' => $status,
            'is_featured' => !empty($input['is_featured']) ? 1 : 0,
            'gst_applicable' => !empty($input['gst_applicable']) ? 1 : 0,
            'custom_shipping' => $customShipping,
            'shipping_price' => $customShipping ? $this->nullableNumber($input['shipping_price'] ?? null) : null,
            'has_color_variants' => $hasColors,
            'colors' => $this->normalizeColors($input['colors'] ?? [], (bool) $hasColors),
            'size_option' => $sizeOption,
            'sizes' => $sizes === [] ? null : json_encode($sizes, JSON_UNESCAPED_UNICODE),
            'images' => $input['images'] ?? [],
            'section_ids' => $input['section_ids'] ?? [],
        ];
    }

    /** @return list<string> */
    private function normalizeSizes(mixed $raw): array
    {
        $allowed = ['sm', 'm', 'l', 'xl', 'xxl'];
        if (is_string($raw)) {
            $raw = $raw === '' || strtolower($raw) === 'none' ? [] : [$raw];
        }
        if (!is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $size) {
            $key = strtolower(trim((string) $size));
            if (in_array($key, $allowed, true) && !in_array($key, $out, true)) {
                $out[] = $key;
            }
        }

        return $out;
    }

    /** @return string|null JSON */
    private function normalizeColors(mixed $raw, bool $enabled): ?string
    {
        if (!$enabled || !is_array($raw)) {
            return null;
        }

        $out = [];
        foreach (array_slice($raw, 0, 4) as $color) {
            if (is_string($color)) {
                $name = trim($color);
                if ($name === '') {
                    continue;
                }
                $out[] = ['name' => $name, 'hex' => '#000000'];
                continue;
            }
            if (!is_array($color)) {
                continue;
            }
            $name = trim((string) ($color['name'] ?? ''));
            $hex = strtoupper(trim((string) ($color['hex'] ?? '#000000')));
            if ($name === '' && ($hex === '' || $hex === '#000000') && empty($color['hex'])) {
                continue;
            }
            if ($name === '') {
                $name = $hex !== '' ? $hex : 'Color';
            }
            if (!preg_match('/^#[0-9A-F]{6}$/', $hex)) {
                $hex = '#000000';
            }
            $out[] = ['name' => $name, 'hex' => $hex];
        }

        return $out === [] ? null : json_encode($out, JSON_UNESCAPED_UNICODE);
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        return $trimmed === '' ? null : $trimmed;
    }

    private function nullableInt(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === false) {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }

    private function nullableNumber(mixed $value): ?float
    {
        if ($value === null || $value === '' || $value === false) {
            return null;
        }
        return (float) $value;
    }

    private function slugExists(string $slug, ?int $excludeId = null): bool
    {
        if ($slug === '') {
            return false;
        }

        if ($excludeId) {
            $stmt = $this->db->prepare('SELECT id FROM products WHERE slug = :slug AND id != :id LIMIT 1');
            $stmt->execute(['slug' => $slug, 'id' => $excludeId]);
        } else {
            $stmt = $this->db->prepare('SELECT id FROM products WHERE slug = :slug LIMIT 1');
            $stmt->execute(['slug' => $slug]);
        }

        return (bool) $stmt->fetch();
    }

    private function handleProductDbError(PDOException $e): void
    {
        $sqlState = (string) ($e->errorInfo[0] ?? '');
        $message = $e->getMessage();
        error_log('Product save failed: ' . $message);

        if ($sqlState === '23000') {
            if (str_contains($message, 'slug') || str_contains($message, 'Duplicate')) {
                Response::jsonError('Validation failed.', 422, ['slug' => ['Slug already exists.']]);
            }
            Response::jsonError('Could not save product. Check category, brand, and section selections.', 422);
        }

        if ($sqlState === '42S02' || str_contains($message, "doesn't exist")) {
            Response::jsonError(
                'Database is missing required tables. Import backend/database/home_sections.sql on production.',
                500
            );
        }

        throw $e;
    }
}

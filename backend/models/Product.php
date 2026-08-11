<?php

declare(strict_types=1);

final class Product
{
    public function __construct(private PDO $db)
    {
    }

    public function findById(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE p.id = :id LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public function findBySlug(string $slug): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT p.*, c.name as category_name, c.slug as category_slug, b.name as brand_name, b.slug as brand_slug
             FROM products p
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE p.slug = :slug AND p.status = :status LIMIT 1'
        );
        $stmt->execute(['slug' => $slug, 'status' => 'active']);
        return $stmt->fetch() ?: null;
    }

    public function getImages(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, image_path, is_primary, sort_order FROM product_images WHERE product_id = :product_id ORDER BY sort_order ASC'
        );
        $stmt->execute(['product_id' => $productId]);
        return $stmt->fetchAll();
    }

    public function getVariants(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, name, sku, price, sale_price, stock, attributes FROM product_variants WHERE product_id = :product_id AND status = :status'
        );
        $stmt->execute(['product_id' => $productId, 'status' => 'active']);
        return $stmt->fetchAll();
    }

    public function list(array $filters, int $limit, int $offset): array
    {
        $where = ['p.status = :status'];
        $params = ['status' => 'active'];

        if (!empty($filters['category_id'])) {
            $where[] = 'p.category_id = :category_id';
            $params['category_id'] = $filters['category_id'];
        }

        if (!empty($filters['brand_id'])) {
            $where[] = 'p.brand_id = :brand_id';
            $params['brand_id'] = $filters['brand_id'];
        }

        if (!empty($filters['search'])) {
            $where[] = '(p.name LIKE :search OR p.description LIKE :search OR p.sku LIKE :search)';
            $params['search'] = '%' . $filters['search'] . '%';
        }

        if (isset($filters['min_price'])) {
            $where[] = 'COALESCE(p.sale_price, p.price) >= :min_price';
            $params['min_price'] = $filters['min_price'];
        }

        if (isset($filters['max_price'])) {
            $where[] = 'COALESCE(p.sale_price, p.price) <= :max_price';
            $params['max_price'] = $filters['max_price'];
        }

        if (!empty($filters['featured'])) {
            $where[] = 'p.is_featured = 1';
        }

        if (!empty($filters['is_new'])) {
            $where[] = 'p.is_new = 1';
        }

        if (!empty($filters['is_trending'])) {
            $where[] = 'p.is_trending = 1';
        }

        if (!empty($filters['is_bestseller'])) {
            $where[] = 'p.is_bestseller = 1';
        }

        if (!empty($filters['section'])) {
            $where[] = 'EXISTS (
                SELECT 1 FROM product_home_sections phs
                INNER JOIN home_sections hs ON hs.id = phs.section_id
                WHERE phs.product_id = p.id
                  AND hs.slug = :section_slug
                  AND hs.status = \'active\'
            )';
            $params['section_slug'] = $filters['section'];
        }

        $orderBy = match ($filters['sort'] ?? 'newest') {
            'price_asc' => 'COALESCE(p.sale_price, p.price) ASC',
            'price_desc' => 'COALESCE(p.sale_price, p.price) DESC',
            'name' => 'p.name ASC',
            default => 'p.created_at DESC',
        };

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM products p WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT p.*, c.name as category_name, b.name as brand_name,
                       (SELECT image_path FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = 1 LIMIT 1) as primary_image
                FROM products p
                LEFT JOIN categories c ON c.id = p.category_id
                LEFT JOIN brands b ON b.id = p.brand_id
                WHERE {$whereClause}
                ORDER BY {$orderBy}
                LIMIT :limit OFFSET :offset";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue(':' . $key, $value);
        }
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        $items = $stmt->fetchAll();
        return ['items' => $this->attachImages($items), 'total' => $total];
    }

    /** Attach up to 3 images per product for cards/list responses. */
    public function attachImages(array $products, int $limit = 3): array
    {
        if ($products === []) {
            return $products;
        }

        $ids = array_values(array_unique(array_map(
            static fn($p) => (int) ($p['id'] ?? 0),
            $products
        )));
        $ids = array_values(array_filter($ids));

        if ($ids === []) {
            return $products;
        }

        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $this->db->prepare(
            "SELECT product_id, id, image_path, is_primary, sort_order
             FROM product_images
             WHERE product_id IN ({$placeholders})
             ORDER BY is_primary DESC, sort_order ASC, id ASC"
        );
        $stmt->execute($ids);
        $rows = $stmt->fetchAll();

        $byProduct = [];
        foreach ($rows as $row) {
            $pid = (int) $row['product_id'];
            if (!isset($byProduct[$pid])) {
                $byProduct[$pid] = [];
            }
            if (count($byProduct[$pid]) >= $limit) {
                continue;
            }
            $byProduct[$pid][] = [
                'id' => (int) $row['id'],
                'image_path' => $row['image_path'],
                'is_primary' => (int) $row['is_primary'],
                'sort_order' => (int) $row['sort_order'],
            ];
        }

        foreach ($products as &$product) {
            $pid = (int) ($product['id'] ?? 0);
            $images = $byProduct[$pid] ?? [];
            $product['images'] = $images;
            if (empty($product['primary_image']) && $images !== []) {
                $product['primary_image'] = $images[0]['image_path'];
            }
        }
        unset($product);

        return $products;
    }
}

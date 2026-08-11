<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class ProductController extends BaseController
{
    private Product $productModel;
    private Review $reviewModel;

    public function __construct()
    {
        parent::__construct();
        $this->productModel = new Product($this->db);
        $this->reviewModel = new Review($this->db);
    }

    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $filters = [
            'category_id' => $_GET['category_id'] ?? null,
            'brand_id' => $_GET['brand_id'] ?? null,
            'search' => $_GET['search'] ?? null,
            'min_price' => $_GET['min_price'] ?? null,
            'max_price' => $_GET['max_price'] ?? null,
            'featured' => isset($_GET['featured']),
            'is_new' => isset($_GET['is_new']),
            'is_trending' => isset($_GET['is_trending']),
            'is_bestseller' => isset($_GET['is_bestseller']),
            'section' => $_GET['section'] ?? null,
            'sort' => $_GET['sort'] ?? 'newest',
        ];

        $result = $this->productModel->list($filters, $pagination['limit'], $pagination['offset']);
        Response::jsonPaginate($result['items'], $result['total'], $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $product = $this->productModel->findBySlug($params['slug']);

        if (!$product) {
            Response::jsonError('Product not found.', 404);
        }

        $product['images'] = $this->productModel->getImages((int) $product['id']);
        $product['variants'] = $this->productModel->getVariants((int) $product['id']);
        $product['average_rating'] = $this->reviewModel->averageRating((int) $product['id']);

        $userId = $this->authUserId();
        if ($userId) {
            $stmt = $this->db->prepare(
                'INSERT INTO recently_viewed (user_id, product_id, viewed_at) VALUES (:user_id, :product_id, NOW())
                 ON DUPLICATE KEY UPDATE viewed_at = NOW()'
            );
            $stmt->execute(['user_id' => $userId, 'product_id' => $product['id']]);
        }

        Response::jsonSuccess($product);
    }

    public function related(array $params): void
    {
        $product = $this->productModel->findBySlug($params['slug']);
        if (!$product) {
            Response::jsonError('Product not found.', 404);
        }

        $stmt = $this->db->prepare(
            'SELECT p.id, p.name, p.slug, p.price, p.sale_price,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as primary_image
             FROM products p
             WHERE p.category_id = :category_id AND p.id != :product_id AND p.status = :status
             ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 8'
        );
        $stmt->execute([
            'category_id' => $product['category_id'],
            'product_id' => $product['id'],
            'status' => 'active',
        ]);

        Response::jsonSuccess($this->productModel->attachImages($stmt->fetchAll()));
    }

    public function frequentlyBought(array $params): void
    {
        $product = $this->productModel->findBySlug($params['slug']);
        if (!$product) {
            Response::jsonError('Product not found.', 404);
        }

        $stmt = $this->db->prepare(
            'SELECT p2.id, p2.name, p2.slug, p2.price, p2.sale_price, COUNT(*) as bought_together_count,
                    (SELECT image_path FROM product_images WHERE product_id = p2.id AND is_primary = 1 LIMIT 1) as primary_image
             FROM order_items oi1
             JOIN order_items oi2 ON oi1.order_id = oi2.order_id AND oi1.product_id != oi2.product_id
             JOIN products p2 ON p2.id = oi2.product_id
             WHERE oi1.product_id = :product_id AND p2.status = :status
             GROUP BY p2.id
             ORDER BY bought_together_count DESC
             LIMIT 6'
        );
        $stmt->execute(['product_id' => $product['id'], 'status' => 'active']);

        Response::jsonSuccess($this->productModel->attachImages($stmt->fetchAll()));
    }

    public function search(array $params = []): void
    {
        $query = trim($_GET['q'] ?? '');
        if ($query === '') {
            Response::jsonError('Search query is required.', 422);
        }

        $pagination = Pagination::resolve();
        $result = $this->productModel->list(['search' => $query, 'sort' => $_GET['sort'] ?? 'newest'], $pagination['limit'], $pagination['offset']);
        Response::jsonPaginate($result['items'], $result['total'], $pagination['page'], $pagination['per_page'], 'Search results.');
    }

    public function filters(array $params = []): void
    {
        $categories = $this->db->query(
            'SELECT c.id, c.name, c.slug, COUNT(p.id) as product_count
             FROM categories c
             LEFT JOIN products p ON p.category_id = c.id AND p.status = "active"
             WHERE c.status = "active"
             GROUP BY c.id ORDER BY c.name ASC'
        )->fetchAll();

        $brands = $this->db->query(
            'SELECT b.id, b.name, b.slug, COUNT(p.id) as product_count
             FROM brands b
             LEFT JOIN products p ON p.brand_id = b.id AND p.status = "active"
             WHERE b.status = "active"
             GROUP BY b.id ORDER BY b.name ASC'
        )->fetchAll();

        $priceRange = $this->db->query(
            'SELECT MIN(COALESCE(sale_price, price)) as min_price, MAX(COALESCE(sale_price, price)) as max_price
             FROM products WHERE status = "active"'
        )->fetch();

        Response::jsonSuccess([
            'categories' => $categories,
            'brands' => $brands,
            'price_range' => $priceRange,
        ]);
    }
}

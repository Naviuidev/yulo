<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CompareController extends BaseController
{
    private const MAX_ITEMS = 4;

    public function index(array $params = []): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare(
            'SELECT cp.id, cp.product_id, p.name, p.slug, p.price, p.sale_price, p.description,
                    c.name as category_name, b.name as brand_name,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM compare_lists cp
             JOIN products p ON p.id = cp.product_id
             LEFT JOIN categories c ON c.id = p.category_id
             LEFT JOIN brands b ON b.id = p.brand_id
             WHERE cp.user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);

        Response::jsonSuccess($stmt->fetchAll());
    }

    public function add(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM compare_lists WHERE user_id = :user_id');
        $countStmt->execute(['user_id' => $userId]);

        if ((int) $countStmt->fetchColumn() >= self::MAX_ITEMS) {
            Response::jsonError('Compare list is full (max ' . self::MAX_ITEMS . ' items).', 422);
        }

        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO compare_lists (user_id, product_id, created_at) VALUES (:user_id, :product_id, NOW())'
        );
        $stmt->execute(['user_id' => $userId, 'product_id' => $input['product_id']]);

        Response::jsonSuccess(null, 'Added to compare list.', 201);
    }

    public function remove(array $params): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare('DELETE FROM compare_lists WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $params['id'], 'user_id' => $userId]);

        Response::jsonSuccess(null, 'Removed from compare list.');
    }

    public function clear(array $params = []): void
    {
        $userId = $this->authUserId();
        $stmt = $this->db->prepare('DELETE FROM compare_lists WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
        Response::jsonSuccess(null, 'Compare list cleared.');
    }
}

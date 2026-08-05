<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class WishlistController extends BaseController
{
    public function index(array $params = []): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare(
            'SELECT w.id, w.product_id, w.created_at, p.name, p.slug, p.price, p.sale_price,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM wishlists w
             JOIN products p ON p.id = w.product_id
             WHERE w.user_id = :user_id AND p.status = :status
             ORDER BY w.created_at DESC'
        );
        $stmt->execute(['user_id' => $userId, 'status' => 'active']);

        Response::jsonSuccess($stmt->fetchAll());
    }

    public function add(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (empty($input['product_id'])) {
            Response::jsonError('Product ID is required.', 422);
        }

        $stmt = $this->db->prepare(
            'INSERT IGNORE INTO wishlists (user_id, product_id, created_at) VALUES (:user_id, :product_id, NOW())'
        );
        $stmt->execute(['user_id' => $userId, 'product_id' => $input['product_id']]);

        Response::jsonSuccess(null, 'Added to wishlist.', 201);
    }

    public function remove(array $params): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare('DELETE FROM wishlists WHERE id = :id AND user_id = :user_id');
        $stmt->execute(['id' => $params['id'], 'user_id' => $userId]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Wishlist item not found.', 404);
        }

        Response::jsonSuccess(null, 'Removed from wishlist.');
    }

    public function toggle(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $check = $this->db->prepare('SELECT id FROM wishlists WHERE user_id = :user_id AND product_id = :product_id LIMIT 1');
        $check->execute(['user_id' => $userId, 'product_id' => $input['product_id']]);
        $existing = $check->fetch();

        if ($existing) {
            $del = $this->db->prepare('DELETE FROM wishlists WHERE id = :id');
            $del->execute(['id' => $existing['id']]);
            Response::jsonSuccess(['in_wishlist' => false], 'Removed from wishlist.');
        }

        $stmt = $this->db->prepare('INSERT INTO wishlists (user_id, product_id, created_at) VALUES (:user_id, :product_id, NOW())');
        $stmt->execute(['user_id' => $userId, 'product_id' => $input['product_id']]);
        Response::jsonSuccess(['in_wishlist' => true], 'Added to wishlist.');
    }
}

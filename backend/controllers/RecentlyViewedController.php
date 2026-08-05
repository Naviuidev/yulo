<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class RecentlyViewedController extends BaseController
{
    public function index(array $params = []): void
    {
        $userId = $this->authUserId();

        $stmt = $this->db->prepare(
            'SELECT rv.viewed_at, p.id, p.name, p.slug, p.price, p.sale_price,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM recently_viewed rv
             JOIN products p ON p.id = rv.product_id
             WHERE rv.user_id = :user_id AND p.status = :status
             ORDER BY rv.viewed_at DESC LIMIT 12'
        );
        $stmt->execute(['user_id' => $userId, 'status' => 'active']);

        Response::jsonSuccess($stmt->fetchAll());
    }
}

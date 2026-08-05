<?php

declare(strict_types=1);

final class Cart
{
    public function __construct(private PDO $db)
    {
    }

    public function getOrCreate(int $userId): int
    {
        $stmt = $this->db->prepare('SELECT id FROM carts WHERE user_id = :user_id LIMIT 1');
        $stmt->execute(['user_id' => $userId]);
        $cart = $stmt->fetch();

        if ($cart) {
            return (int) $cart['id'];
        }

        $stmt = $this->db->prepare('INSERT INTO carts (user_id, created_at, updated_at) VALUES (:user_id, NOW(), NOW())');
        $stmt->execute(['user_id' => $userId]);
        return (int) $this->db->lastInsertId();
    }

    public function getItems(int $cartId): array
    {
        $stmt = $this->db->prepare(
            'SELECT ci.*, p.name, p.slug, p.price, p.sale_price, p.stock,
                    pv.name as variant_name, pv.price as variant_price, pv.sale_price as variant_sale_price,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             LEFT JOIN product_variants pv ON pv.id = ci.variant_id
             WHERE ci.cart_id = :cart_id'
        );
        $stmt->execute(['cart_id' => $cartId]);
        return $stmt->fetchAll();
    }

    public function clear(int $cartId): void
    {
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE cart_id = :cart_id');
        $stmt->execute(['cart_id' => $cartId]);
    }
}

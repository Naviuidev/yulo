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
        SchemaGuard::ensureProductCommerceOptions($this->db);
        SchemaGuard::ensureCartOrderItemOptions($this->db);

        // Alias columns so p.price does not overwrite cart_items.price (ci.*).
        $stmt = $this->db->prepare(
            'SELECT ci.id, ci.cart_id, ci.product_id, ci.variant_id, ci.quantity,
                    ci.price AS cart_price, ci.color, ci.size, ci.created_at, ci.updated_at,
                    p.name, p.slug, p.price, p.sale_price, p.stock, p.gst_applicable,
                    p.custom_shipping, p.shipping_price, p.has_color_variants, p.colors, p.size_option, p.sizes,
                    pv.name AS variant_name, pv.price AS variant_price, pv.sale_price AS variant_sale_price,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) AS image
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

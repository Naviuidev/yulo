<?php

declare(strict_types=1);

final class Order
{
    public function __construct(private PDO $db)
    {
    }

    public function findById(int $id, ?int $userId = null): ?array
    {
        $sql = 'SELECT o.*, u.name as customer_name, u.email as customer_email
                FROM orders o
                JOIN users u ON u.id = o.user_id
                WHERE o.id = :id';
        $params = ['id' => $id];

        if ($userId !== null) {
            $sql .= ' AND o.user_id = :user_id';
            $params['user_id'] = $userId;
        }

        $sql .= ' LIMIT 1';

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch() ?: null;
    }

    public function getItems(int $orderId): array
    {
        SchemaGuard::ensureCartOrderItemOptions($this->db);
        $stmt = $this->db->prepare(
            'SELECT oi.*, p.name as product_name, p.slug as product_slug,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :order_id'
        );
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll();
    }

    public function generateOrderNumber(): string
    {
        return 'YULO-' . date('Ymd') . '-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    public function listByUser(int $userId, int $limit, int $offset): array
    {
        $countStmt = $this->db->prepare('SELECT COUNT(*) FROM orders WHERE user_id = :user_id');
        $countStmt->execute(['user_id' => $userId]);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            'SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.created_at,
                    (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count,
                    (
                        SELECT p.name
                        FROM order_items oi
                        JOIN products p ON p.id = oi.product_id
                        WHERE oi.order_id = o.id
                        ORDER BY oi.id ASC
                        LIMIT 1
                    ) AS product_name,
                    (
                        SELECT COALESCE(
                            (SELECT pi.image_path FROM product_images pi WHERE pi.product_id = oi.product_id AND pi.is_primary = 1 LIMIT 1),
                            (SELECT pi2.image_path FROM product_images pi2 WHERE pi2.product_id = oi.product_id ORDER BY pi2.id ASC LIMIT 1)
                        )
                        FROM order_items oi
                        WHERE oi.order_id = o.id
                        ORDER BY oi.id ASC
                        LIMIT 1
                    ) AS product_image
             FROM orders o
             WHERE o.user_id = :user_id
             ORDER BY o.created_at DESC
             LIMIT :limit OFFSET :offset'
        );
        $stmt->bindValue(':user_id', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['items' => $stmt->fetchAll(), 'total' => $total];
    }
}

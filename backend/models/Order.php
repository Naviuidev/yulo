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
        SchemaGuard::ensureProductCommerceOptions($this->db);
        $stmt = $this->db->prepare(
            'SELECT oi.*, p.name as product_name, p.slug as product_slug,
                    p.cancel_available, p.cod_available, p.return_available,
                    (SELECT image_path FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = :order_id'
        );
        $stmt->execute(['order_id' => $orderId]);
        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            $row['cancel_available'] = (int) ($row['cancel_available'] ?? 1);
            $row['cod_available'] = (int) ($row['cod_available'] ?? 1);
            $row['return_available'] = (int) ($row['return_available'] ?? 1);
        }
        unset($row);
        return $rows;
    }

    /** True when every product on the order allows customer cancellation. */
    public function customerCancelAllowed(int $orderId): bool
    {
        $items = $this->getItems($orderId);
        if ($items === []) {
            return false;
        }
        foreach ($items as $item) {
            if ((int) ($item['cancel_available'] ?? 1) !== 1) {
                return false;
            }
        }
        return true;
    }

    /** True when every product on the order allows customer return requests. */
    public function customerReturnAllowed(int $orderId): bool
    {
        $items = $this->getItems($orderId);
        if ($items === []) {
            return false;
        }
        foreach ($items as $item) {
            if ((int) ($item['return_available'] ?? 1) !== 1) {
                return false;
            }
        }
        return true;
    }

    /** Latest return request for an order, if any. */
    public function getLatestReturn(int $orderId): ?array
    {
        SchemaGuard::ensureOrderReturns($this->db);
        $stmt = $this->db->prepare(
            'SELECT id, order_id, user_id, status, reason, admin_notes, created_at, updated_at
             FROM order_returns WHERE order_id = :order_id ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['order_id' => $orderId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Open return = requested or in_process. */
    public function hasOpenReturn(int $orderId): bool
    {
        $ret = $this->getLatestReturn($orderId);
        if (!$ret) {
            return false;
        }
        return in_array((string) ($ret['status'] ?? ''), ['requested', 'in_process'], true);
    }

    /** Help / contact messages between customer and YULO for an order. */
    public function getHelpMessages(int $orderId): array
    {
        SchemaGuard::ensureOrderHelpMessages($this->db);
        $stmt = $this->db->prepare(
            'SELECT id, order_id, user_id, sender, message, created_at
             FROM order_help_messages
             WHERE order_id = :order_id
             ORDER BY id ASC'
        );
        $stmt->execute(['order_id' => $orderId]);
        return $stmt->fetchAll() ?: [];
    }

    public function addHelpMessage(int $orderId, int $userId, string $sender, string $message): int
    {
        SchemaGuard::ensureOrderHelpMessages($this->db);
        $sender = in_array($sender, ['customer', 'admin'], true) ? $sender : 'customer';
        $text = trim($message);
        if ($text === '') {
            throw new InvalidArgumentException('Message is required.');
        }

        $stmt = $this->db->prepare(
            'INSERT INTO order_help_messages (order_id, user_id, sender, message, created_at)
             VALUES (:order_id, :user_id, :sender, :message, NOW())'
        );
        $stmt->execute([
            'order_id' => $orderId,
            'user_id' => $userId,
            'sender' => $sender,
            'message' => mb_substr($text, 0, 4000),
        ]);

        return (int) $this->db->lastInsertId();
    }

    /** Return window in days after delivery (matches returns policy). */
    public const RETURN_WINDOW_DAYS = 7;

    /**
     * Whether the order is still inside the post-delivery return window.
     * Uses delivered_at when set; falls back to updated_at for delivered orders.
     */
    public function withinReturnWindow(array $order): bool
    {
        if ((string) ($order['status'] ?? '') !== 'delivered') {
            return false;
        }

        $anchor = trim((string) ($order['delivered_at'] ?? ''));
        if ($anchor === '') {
            $anchor = trim((string) ($order['updated_at'] ?? ''));
        }
        if ($anchor === '') {
            return false;
        }

        $deliveredTs = strtotime($anchor);
        if ($deliveredTs === false) {
            return false;
        }

        $deadline = $deliveredTs + (self::RETURN_WINDOW_DAYS * 86400);
        return time() <= $deadline;
    }

    /**
     * Restore stock for all order lines (products / variants).
     * Safe to call once when transitioning into cancelled / returned.
     */
    public function restoreStock(int $orderId): void
    {
        SchemaGuard::ensureCartOrderItemOptions($this->db);
        $items = $this->getItems($orderId);
        foreach ($items as $item) {
            $qty = (int) ($item['quantity'] ?? 0);
            if ($qty <= 0) {
                continue;
            }
            if (!empty($item['variant_id'])) {
                $this->db->prepare(
                    'UPDATE product_variants SET stock = stock + :qty WHERE id = :id'
                )->execute(['qty' => $qty, 'id' => (int) $item['variant_id']]);
            } else {
                $this->db->prepare(
                    'UPDATE products SET stock = stock + :qty WHERE id = :id'
                )->execute(['qty' => $qty, 'id' => (int) $item['product_id']]);
            }
        }
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

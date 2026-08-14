<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin activity notifications built from live commerce data
 * (orders, followups, stock, customers) with per-admin read state.
 */
final class NotificationAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        SchemaGuard::ensureAdminNotificationReads($this->db);
        SchemaGuard::ensureTrackingFollowups($this->db);

        $adminId = (int) $this->authUserId();
        $items = $this->buildFeed();
        $readKeys = $this->readKeysFor($adminId);

        $out = [];
        $unread = 0;
        foreach ($items as $item) {
            $isRead = isset($readKeys[$item['key']]);
            if (!$isRead) {
                $unread++;
            }
            $out[] = array_merge($item, [
                'read' => $isRead,
                'id' => $item['key'],
            ]);
        }

        Response::jsonSuccess([
            'items' => $out,
            'unread_count' => $unread,
            'total' => count($out),
        ]);
    }

    public function unreadCount(array $params = []): void
    {
        SchemaGuard::ensureAdminNotificationReads($this->db);
        SchemaGuard::ensureTrackingFollowups($this->db);

        $adminId = (int) $this->authUserId();
        $items = $this->buildFeed();
        $readKeys = $this->readKeysFor($adminId);
        $unread = 0;
        foreach ($items as $item) {
            if (!isset($readKeys[$item['key']])) {
                $unread++;
            }
        }

        Response::jsonSuccess(['unread_count' => $unread]);
    }

    public function markRead(array $params = []): void
    {
        SchemaGuard::ensureAdminNotificationReads($this->db);

        $adminId = (int) $this->authUserId();
        $input = $this->getJsonInput();
        $key = trim((string) ($input['key'] ?? $params['id'] ?? ''));
        if ($key === '' || strlen($key) > 120) {
            Response::jsonError('Invalid notification key.', 422);
        }

        $this->upsertRead($adminId, $key);
        Response::jsonSuccess(null, 'Notification marked as read.');
    }

    public function markAllRead(array $params = []): void
    {
        SchemaGuard::ensureAdminNotificationReads($this->db);
        SchemaGuard::ensureTrackingFollowups($this->db);

        $adminId = (int) $this->authUserId();
        foreach ($this->buildFeed() as $item) {
            $this->upsertRead($adminId, $item['key']);
        }

        Response::jsonSuccess(null, 'All notifications marked as read.');
    }

    /** @return list<array<string, mixed>> */
    private function buildFeed(): array
    {
        $items = [];

        foreach ($this->orderItems() as $row) {
            $items[] = $row;
        }
        foreach ($this->followupItems() as $row) {
            $items[] = $row;
        }
        foreach ($this->stockItems() as $row) {
            $items[] = $row;
        }
        foreach ($this->customerItems() as $row) {
            $items[] = $row;
        }

        usort($items, static function (array $a, array $b): int {
            return strcmp((string) $b['created_at'], (string) $a['created_at']);
        });

        return array_slice($items, 0, 80);
    }

    /** @return list<array<string, mixed>> */
    private function orderItems(): array
    {
        $stmt = $this->db->query(
            "SELECT o.id, o.order_number, o.total, o.status, o.payment_status, o.created_at, u.name AS customer_name
             FROM orders o
             JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC
             LIMIT 30"
        );

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $paid = ($row['payment_status'] ?? '') === 'paid';
            $title = $paid ? 'New paid order' : 'New order placed';
            if (($row['status'] ?? '') === 'pending') {
                $title = $paid ? 'Order awaiting fulfilment' : 'Order awaiting confirmation';
            } elseif (in_array($row['status'], ['shipped', 'out_for_delivery'], true)) {
                $title = 'Order in transit';
            } elseif (($row['status'] ?? '') === 'delivered') {
                $title = 'Order delivered';
            } elseif (($row['status'] ?? '') === 'cancelled') {
                $title = 'Order cancelled';
            }

            $total = number_format((float) $row['total'], 2);
            $out[] = [
                'key' => 'order:' . $row['id'],
                'type' => 'order',
                'title' => $title,
                'message' => sprintf(
                    '%s · %s · ₹%s · %s',
                    $row['order_number'],
                    $row['customer_name'] ?: 'Customer',
                    $total,
                    ucfirst(str_replace('_', ' ', (string) $row['status']))
                ),
                'link' => '/orders/' . $row['id'],
                'created_at' => $row['created_at'],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function followupItems(): array
    {
        $stmt = $this->db->query(
            "SELECT f.id, f.status, f.subject, f.created_at, f.responded_at, o.id AS order_id, o.order_number,
                    COALESCE(f.customer_name, u.name) AS customer_name
             FROM tracking_followups f
             JOIN orders o ON o.id = f.order_id
             LEFT JOIN users u ON u.id = f.user_id
             ORDER BY f.created_at DESC
             LIMIT 20"
        );

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $pending = ($row['status'] ?? '') === 'pending';
            $out[] = [
                'key' => 'followup:' . $row['id'],
                'type' => 'followup',
                'title' => $pending ? 'Tracking query raised' : 'Tracking response shared',
                'message' => sprintf(
                    '%s · Order %s · %s',
                    $row['customer_name'] ?: 'Customer',
                    $row['order_number'],
                    $row['subject'] ?: 'Tracking follow-up'
                ),
                'link' => '/followups?id=' . $row['id'],
                'created_at' => $pending
                    ? $row['created_at']
                    : ($row['responded_at'] ?: $row['created_at']),
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function stockItems(): array
    {
        $stmt = $this->db->query(
            "SELECT id, name, stock, updated_at, created_at
             FROM products
             WHERE status = 'active' AND stock <= 5
             ORDER BY stock ASC, updated_at DESC
             LIMIT 20"
        );

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $stock = (int) $row['stock'];
            $out[] = [
                'key' => 'stock:' . $row['id'],
                'type' => 'stock',
                'title' => $stock <= 0 ? 'Out of stock' : 'Low stock alert',
                'message' => sprintf('%s is down to %d unit%s', $row['name'], $stock, $stock === 1 ? '' : 's'),
                'link' => '/products/' . $row['id'] . '/edit',
                'created_at' => $row['updated_at'] ?: $row['created_at'],
            ];
        }
        return $out;
    }

    /** @return list<array<string, mixed>> */
    private function customerItems(): array
    {
        $stmt = $this->db->query(
            "SELECT id, name, email, created_at
             FROM users
             WHERE role = 'customer'
               AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             ORDER BY created_at DESC
             LIMIT 20"
        );

        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[] = [
                'key' => 'customer:' . $row['id'],
                'type' => 'customer',
                'title' => 'New customer registered',
                'message' => sprintf('%s (%s)', $row['name'] ?: 'Customer', $row['email']),
                'link' => '/customers/' . $row['id'],
                'created_at' => $row['created_at'],
            ];
        }
        return $out;
    }

    /** @return array<string, true> */
    private function readKeysFor(int $adminId): array
    {
        $stmt = $this->db->prepare(
            'SELECT item_key FROM admin_notification_reads WHERE user_id = :user_id'
        );
        $stmt->execute(['user_id' => $adminId]);
        $keys = [];
        foreach ($stmt->fetchAll() as $row) {
            $keys[(string) $row['item_key']] = true;
        }
        return $keys;
    }

    private function upsertRead(int $adminId, string $key): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO admin_notification_reads (user_id, item_key, read_at)
             VALUES (:user_id, :item_key, NOW())
             ON DUPLICATE KEY UPDATE read_at = NOW()'
        );
        $stmt->execute([
            'user_id' => $adminId,
            'item_key' => $key,
        ]);
    }
}

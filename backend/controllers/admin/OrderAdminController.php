<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

final class OrderAdminController extends BaseController
{
    private Order $orderModel;

    public function __construct()
    {
        parent::__construct();
        $this->orderModel = new Order($this->db);
    }

    public function index(array $params = []): void
    {
        $pagination = Pagination::resolve();
        $status = $_GET['status'] ?? null;

        $where = '1=1';
        $bind = [];

        if ($status) {
            $where .= ' AND o.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM orders o WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT o.*, u.name as customer_name, u.email as customer_email
             FROM orders o JOIN users u ON u.id = o.user_id
             WHERE {$where} ORDER BY o.created_at DESC LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        Response::jsonPaginate($stmt->fetchAll(), $total, $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $order = $this->orderModel->findById((int) $params['id']);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $order['items'] = $this->orderModel->getItems((int) $order['id']);

        $delStmt = $this->db->prepare(
            'SELECT id, carrier, tracking_number, status, estimated_delivery, notes, created_at
             FROM deliveries WHERE order_id = :order_id ORDER BY id DESC LIMIT 1'
        );
        $delStmt->execute(['order_id' => $order['id']]);
        $order['delivery'] = $delStmt->fetch() ?: null;

        Response::jsonSuccess($order);
    }

    public function updateStatus(array $params): void
    {
        $input = $this->getJsonInput();
        $allowed = [
            'pending', 'confirmed', 'processing', 'packed', 'shipped',
            'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded',
        ];

        if (empty($input['status']) || !in_array($input['status'], $allowed, true)) {
            Response::jsonError('Invalid status.', 422);
        }

        $orderId = (int) $params['id'];
        $status = (string) $input['status'];
        $notifyCustomer = !empty($input['notify_customer']);

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $stmt = $this->db->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['status' => $status, 'id' => $orderId]);

        $labels = [
            'pending' => 'Pending',
            'confirmed' => 'Confirmed',
            'processing' => 'Processing',
            'packed' => 'Packed',
            'shipped' => 'Shipped',
            'out_for_delivery' => 'Out for Delivery',
            'delivered' => 'Delivered',
            'cancelled' => 'Cancelled',
            'returned' => 'Returned',
            'refunded' => 'Refunded',
        ];
        $statusLabel = $labels[$status] ?? $status;

        $notif = $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_at) VALUES (:user_id, :title, :message, :type, NOW())'
        );
        $notif->execute([
            'user_id' => $order['user_id'],
            'title' => 'Order ' . $statusLabel,
            'message' => "Your order {$order['order_number']} is now {$statusLabel}.",
            'type' => 'order',
        ]);

        $emailResult = ['sent' => false, 'message' => 'Email not requested.'];
        if ($notifyCustomer) {
            try {
                $emailResult = (new OrderMailService($this->db))->notifyStatusUpdate($orderId, $status);
            } catch (Throwable $e) {
                error_log('Order status email failed: ' . $e->getMessage());
                $emailResult = ['sent' => false, 'message' => 'Failed to send status email.'];
            }
        }

        Response::jsonSuccess([
            'status' => $status,
            'email_sent' => (bool) ($emailResult['sent'] ?? false),
            'email_message' => (string) ($emailResult['message'] ?? ''),
        ], 'Order status updated.');
    }

    /** Save tracking number and optionally email the customer a track link. */
    public function shareTracking(array $params): void
    {
        $input = $this->getJsonInput();
        $orderId = (int) $params['id'];
        $trackingNumber = trim((string) ($input['tracking_number'] ?? ''));
        $carrier = trim((string) ($input['carrier'] ?? ''));
        $notifyCustomer = !array_key_exists('notify_customer', $input) || !empty($input['notify_customer']);
        $markShipped = !array_key_exists('mark_shipped', $input) || !empty($input['mark_shipped']);

        if ($trackingNumber === '') {
            Response::jsonError('Tracking number is required.', 422);
        }

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $existing = $this->db->prepare(
            'SELECT id FROM deliveries WHERE order_id = :order_id ORDER BY id DESC LIMIT 1'
        );
        $existing->execute(['order_id' => $orderId]);
        $deliveryId = $existing->fetchColumn();

        if ($deliveryId) {
            $this->db->prepare(
                'UPDATE deliveries
                 SET carrier = :carrier, tracking_number = :tracking_number, status = :status, updated_at = NOW()
                 WHERE id = :id'
            )->execute([
                'carrier' => $carrier !== '' ? $carrier : null,
                'tracking_number' => $trackingNumber,
                'status' => 'in_transit',
                'id' => (int) $deliveryId,
            ]);
        } else {
            $this->db->prepare(
                'INSERT INTO deliveries (order_id, carrier, tracking_number, status, created_at, updated_at)
                 VALUES (:order_id, :carrier, :tracking_number, :status, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'carrier' => $carrier !== '' ? $carrier : null,
                'tracking_number' => $trackingNumber,
                'status' => 'in_transit',
            ]);
            $deliveryId = (int) $this->db->lastInsertId();
        }

        if ($markShipped && !in_array($order['status'], ['shipped', 'out_for_delivery', 'delivered'], true)) {
            $this->db->prepare(
                'UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id'
            )->execute(['status' => 'shipped', 'id' => $orderId]);
        }

        $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_at)
             VALUES (:user_id, :title, :message, :type, NOW())'
        )->execute([
            'user_id' => $order['user_id'],
            'title' => 'Tracking available',
            'message' => "Tracking for order {$order['order_number']}: {$trackingNumber}",
            'type' => 'order',
        ]);

        $emailResult = ['sent' => false, 'message' => 'Email not requested.', 'track_url' => null];
        if ($notifyCustomer) {
            try {
                $emailResult = (new OrderMailService($this->db))->notifyTrackingShared(
                    $orderId,
                    $trackingNumber,
                    $carrier
                );
            } catch (Throwable $e) {
                error_log('Tracking email failed: ' . $e->getMessage());
                $emailResult = ['sent' => false, 'message' => 'Failed to send tracking email.', 'track_url' => null];
            }
        }

        Response::jsonSuccess([
            'delivery_id' => (int) $deliveryId,
            'tracking_number' => $trackingNumber,
            'carrier' => $carrier,
            'email_sent' => (bool) ($emailResult['sent'] ?? false),
            'email_message' => (string) ($emailResult['message'] ?? ''),
            'track_url' => $emailResult['track_url'] ?? null,
        ], 'Tracking shared.');
    }
}

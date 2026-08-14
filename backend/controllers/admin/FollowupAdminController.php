<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/** Admin tracking follow-ups raised by customers. */
final class FollowupAdminController extends BaseController
{
    public function index(array $params = []): void
    {
        SchemaGuard::ensureTrackingFollowups($this->db);
        $pagination = Pagination::resolve();
        $status = trim((string) ($_GET['status'] ?? ''));

        $where = '1=1';
        $bind = [];
        if (in_array($status, ['pending', 'shared_response'], true)) {
            $where .= ' AND f.status = :status';
            $bind['status'] = $status;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM tracking_followups f WHERE {$where}");
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $sql = "SELECT f.*, o.order_number, o.status AS order_status, o.total AS order_total
                FROM tracking_followups f
                JOIN orders o ON o.id = f.order_id
                WHERE {$where}
                ORDER BY f.created_at DESC
                LIMIT :limit OFFSET :offset";
        $stmt = $this->db->prepare($sql);
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
        SchemaGuard::ensureTrackingFollowups($this->db);
        $id = (int) ($params['id'] ?? 0);

        $stmt = $this->db->prepare(
            'SELECT f.*, o.order_number, o.status AS order_status, o.total AS order_total,
                    o.shipping_address, o.payment_status, o.payment_method
             FROM tracking_followups f
             JOIN orders o ON o.id = f.order_id
             WHERE f.id = :id
             LIMIT 1'
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        if (!$row) {
            Response::jsonError('Follow-up not found.', 404);
        }

        Response::jsonSuccess($row);
    }

    /** Share tracking with customer and mark follow-up as shared_response. */
    public function shareResponse(array $params): void
    {
        SchemaGuard::ensureTrackingFollowups($this->db);
        $input = $this->getJsonInput();
        $id = (int) ($params['id'] ?? 0);
        $trackingNumber = trim((string) ($input['tracking_number'] ?? ''));
        $carrier = trim((string) ($input['carrier'] ?? ''));
        $adminNotes = trim((string) ($input['admin_notes'] ?? ''));
        $notifyCustomer = !array_key_exists('notify_customer', $input) || !empty($input['notify_customer']);

        if ($trackingNumber === '') {
            Response::jsonError('Tracking number is required.', 422);
        }

        $stmt = $this->db->prepare('SELECT * FROM tracking_followups WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $followup = $stmt->fetch();
        if (!$followup) {
            Response::jsonError('Follow-up not found.', 404);
        }

        $orderId = (int) $followup['order_id'];
        $orderModel = new Order($this->db);
        $order = $orderModel->findById($orderId);
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
        }

        if (!in_array($order['status'], ['shipped', 'out_for_delivery', 'delivered'], true)) {
            $this->db->prepare(
                'UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id'
            )->execute(['status' => 'shipped', 'id' => $orderId]);
        }

        $this->db->prepare(
            "UPDATE tracking_followups
             SET status = 'shared_response',
                 tracking_number = :tracking_number,
                 carrier = :carrier,
                 admin_notes = :admin_notes,
                 responded_at = NOW(),
                 updated_at = NOW()
             WHERE id = :id"
        )->execute([
            'tracking_number' => $trackingNumber,
            'carrier' => $carrier !== '' ? $carrier : null,
            'admin_notes' => $adminNotes !== '' ? $adminNotes : null,
            'id' => $id,
        ]);

        $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_at)
             VALUES (:user_id, :title, :message, :type, NOW())'
        )->execute([
            'user_id' => $order['user_id'],
            'title' => 'Tracking shared',
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
                error_log('Followup tracking email failed: ' . $e->getMessage());
                $emailResult = ['sent' => false, 'message' => 'Failed to send tracking email.', 'track_url' => null];
            }
        }

        Response::jsonSuccess([
            'id' => $id,
            'status' => 'shared_response',
            'tracking_number' => $trackingNumber,
            'carrier' => $carrier,
            'email_sent' => (bool) ($emailResult['sent'] ?? false),
            'email_message' => (string) ($emailResult['message'] ?? ''),
            'track_url' => $emailResult['track_url'] ?? null,
        ], 'Tracking shared with customer.');
    }

    public function destroy(array $params): void
    {
        SchemaGuard::ensureTrackingFollowups($this->db);
        $id = (int) ($params['id'] ?? 0);

        $stmt = $this->db->prepare('DELETE FROM tracking_followups WHERE id = :id');
        $stmt->execute(['id' => $id]);

        if ($stmt->rowCount() === 0) {
            Response::jsonError('Follow-up not found.', 404);
        }

        Response::jsonSuccess(null, 'Follow-up deleted.');
    }
}

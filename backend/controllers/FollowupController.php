<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

/** Customer-facing tracking follow-up queries. */
final class FollowupController extends BaseController
{
    public function store(array $params = []): void
    {
        $userId = $this->authUserId();
        $input = $this->getJsonInput();
        SchemaGuard::ensureTrackingFollowups($this->db);

        $orderId = (int) ($input['order_id'] ?? 0);
        $message = trim((string) ($input['message'] ?? ''));
        $subject = trim((string) ($input['subject'] ?? 'Request for tracking details'));

        if ($orderId <= 0) {
            Response::jsonError('Order ID is required.', 422);
        }
        if ($message === '') {
            Response::jsonError('Please enter a short message for your query.', 422);
        }
        if ($subject === '') {
            $subject = 'Request for tracking details';
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById($orderId, $userId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        // If tracking already exists, no need to raise a query.
        $delStmt = $this->db->prepare(
            'SELECT tracking_number FROM deliveries WHERE order_id = :order_id ORDER BY id DESC LIMIT 1'
        );
        $delStmt->execute(['order_id' => $orderId]);
        $existingTracking = trim((string) ($delStmt->fetchColumn() ?: ''));
        if ($existingTracking !== '') {
            Response::jsonError('Tracking is already available for this order.', 422);
        }

        // Avoid duplicate open queries for the same order.
        $dup = $this->db->prepare(
            "SELECT id FROM tracking_followups
             WHERE order_id = :order_id AND user_id = :user_id AND status = 'pending'
             LIMIT 1"
        );
        $dup->execute(['order_id' => $orderId, 'user_id' => $userId]);
        if ($dup->fetchColumn()) {
            Response::jsonError('You already have a pending tracking query for this order.', 422);
        }

        $shipping = json_decode((string) ($order['shipping_address'] ?? '{}'), true);
        if (!is_array($shipping)) {
            $shipping = [];
        }

        $customerName = (string) ($order['customer_name'] ?? $shipping['name'] ?? $shipping['full_name'] ?? '');
        $customerEmail = (string) ($order['customer_email'] ?? '');
        $customerPhone = (string) ($shipping['phone'] ?? $order['customer_phone'] ?? '');

        $stmt = $this->db->prepare(
            'INSERT INTO tracking_followups
                (order_id, user_id, subject, message, customer_name, customer_email, customer_phone, status, created_at, updated_at)
             VALUES
                (:order_id, :user_id, :subject, :message, :customer_name, :customer_email, :customer_phone, :status, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $orderId,
            'user_id' => $userId,
            'subject' => mb_substr($subject, 0, 255),
            'message' => $message,
            'customer_name' => $customerName !== '' ? $customerName : null,
            'customer_email' => $customerEmail !== '' ? $customerEmail : null,
            'customer_phone' => $customerPhone !== '' ? $customerPhone : null,
            'status' => 'pending',
        ]);

        $followupId = (int) $this->db->lastInsertId();

        try {
            (new OrderMailService($this->db))->notifyAdminTrackingFollowup($followupId);
        } catch (Throwable $e) {
            error_log('Followup admin email failed: ' . $e->getMessage());
        }

        Response::jsonSuccess([
            'id' => $followupId,
            'status' => 'pending',
        ], 'Tracking query submitted. Our team will respond soon.', 201);
    }

    public function forOrder(array $params): void
    {
        $userId = $this->authUserId();
        $orderId = (int) ($params['order_id'] ?? 0);
        SchemaGuard::ensureTrackingFollowups($this->db);

        $orderModel = new Order($this->db);
        $order = $orderModel->findById($orderId, $userId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $stmt = $this->db->prepare(
            'SELECT id, order_id, subject, message, status, tracking_number, carrier, created_at, responded_at
             FROM tracking_followups
             WHERE order_id = :order_id AND user_id = :user_id
             ORDER BY id DESC'
        );
        $stmt->execute(['order_id' => $orderId, 'user_id' => $userId]);

        Response::jsonSuccess($stmt->fetchAll());
    }
}

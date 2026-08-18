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
        SchemaGuard::ensureOrderReturns($this->db);

        $pagination = Pagination::resolve();
        $status = $_GET['status'] ?? null;
        $returnFilter = $_GET['return_status'] ?? null;

        $where = '1=1';
        $bind = [];

        if ($status) {
            $where .= ' AND o.status = :status';
            $bind['status'] = $status;
        }

        if ($returnFilter) {
            $where .= ' AND r.status = :return_status';
            $bind['return_status'] = $returnFilter;
        }

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN order_returns r ON r.id = (
                SELECT id FROM order_returns WHERE order_id = o.id ORDER BY id DESC LIMIT 1
             )
             WHERE {$where}"
        );
        $countStmt->execute($bind);
        $total = (int) $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT o.*, u.name as customer_name, u.email as customer_email,
                    r.id as return_id, r.status as return_status, r.reason as return_reason,
                    r.admin_notes as return_admin_notes, r.created_at as return_requested_at
             FROM orders o
             JOIN users u ON u.id = o.user_id
             LEFT JOIN order_returns r ON r.id = (
                SELECT id FROM order_returns WHERE order_id = o.id ORDER BY id DESC LIMIT 1
             )
             WHERE {$where}
             ORDER BY o.created_at DESC
             LIMIT :limit OFFSET :offset"
        );
        foreach ($bind as $k => $v) {
            $stmt->bindValue(':' . $k, $v);
        }
        $stmt->bindValue(':limit', $pagination['limit'], PDO::PARAM_INT);
        $stmt->bindValue(':offset', $pagination['offset'], PDO::PARAM_INT);
        $stmt->execute();

        $rows = $stmt->fetchAll();
        foreach ($rows as &$row) {
            if (!empty($row['return_id'])) {
                $row['return'] = [
                    'id' => (int) $row['return_id'],
                    'status' => $row['return_status'],
                    'reason' => $row['return_reason'],
                    'admin_notes' => $row['return_admin_notes'],
                    'created_at' => $row['return_requested_at'],
                ];
                $row['has_open_return'] = in_array(
                    (string) $row['return_status'],
                    ['requested', 'in_process'],
                    true
                );
            } else {
                $row['return'] = null;
                $row['has_open_return'] = false;
            }
            unset(
                $row['return_id'],
                $row['return_status'],
                $row['return_reason'],
                $row['return_admin_notes'],
                $row['return_requested_at']
            );
        }
        unset($row);

        Response::jsonPaginate($rows, $total, $pagination['page'], $pagination['per_page']);
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

        $order['return'] = $this->orderModel->getLatestReturn((int) $order['id']);
        $order['has_open_return'] = $this->orderModel->hasOpenReturn((int) $order['id']);
        $order['help_messages'] = $this->orderModel->getHelpMessages((int) $order['id']);

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

        $previousStatus = (string) ($order['status'] ?? '');

        SchemaGuard::ensureOrderDeliveredAt($this->db);

        try {
            $this->db->beginTransaction();

            $stmt = $this->db->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id');
            $stmt->execute(['status' => $status, 'id' => $orderId]);

            if ($status === 'delivered' && empty($order['delivered_at'])) {
                $this->db->prepare(
                    'UPDATE orders SET delivered_at = NOW() WHERE id = :id AND delivered_at IS NULL'
                )->execute(['id' => $orderId]);
            }

            // Restore inventory when admin cancels (or returns) an active order once.
            $stockRestoreStatuses = ['cancelled', 'returned'];
            $alreadyRestored = in_array($previousStatus, ['cancelled', 'returned', 'refunded'], true);
            if (in_array($status, $stockRestoreStatuses, true) && !$alreadyRestored) {
                $this->orderModel->restoreStock($orderId);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Admin order status update failed: ' . $e->getMessage());
            Response::jsonError('Could not update order status.', 500);
        }

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

    /**
     * Admin return workflow: keep in_process, reject, or complete.
     * Body: status (in_process|rejected|completed), admin_notes?, notify_customer?,
     *       mark_order_returned? (default true when completed), mark_refunded? (default false).
     */
    public function updateReturn(array $params): void
    {
        SchemaGuard::ensureOrderReturns($this->db);
        SchemaGuard::ensureOrderDeliveredAt($this->db);

        $input = $this->getJsonInput();
        $orderId = (int) $params['id'];
        $status = trim((string) ($input['status'] ?? ''));
        $allowed = ['in_process', 'rejected', 'completed'];
        if (!in_array($status, $allowed, true)) {
            Response::jsonError('Invalid return status. Use in_process, rejected, or completed.', 422);
        }

        $adminNotes = trim((string) ($input['admin_notes'] ?? ''));
        $notifyCustomer = !array_key_exists('notify_customer', $input) || !empty($input['notify_customer']);
        $markOrderReturned = !array_key_exists('mark_order_returned', $input) || !empty($input['mark_order_returned']);
        $markRefunded = !empty($input['mark_refunded']);

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $ret = $this->orderModel->getLatestReturn($orderId);
        if (!$ret) {
            Response::jsonError('No return request found for this order.', 404);
        }

        $current = (string) ($ret['status'] ?? '');
        if (in_array($current, ['completed', 'rejected'], true) && $status !== $current) {
            Response::jsonError('This return is already closed (' . $current . ').', 422);
        }

        $previousOrderStatus = (string) ($order['status'] ?? '');

        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'UPDATE order_returns
                 SET status = :status, admin_notes = :admin_notes, updated_at = NOW()
                 WHERE id = :id'
            )->execute([
                'status' => $status,
                'admin_notes' => $adminNotes !== '' ? mb_substr($adminNotes, 0, 2000) : ($ret['admin_notes'] ?? null),
                'id' => (int) $ret['id'],
            ]);

            if ($status === 'completed' && $markOrderReturned) {
                $alreadyRestored = in_array($previousOrderStatus, ['cancelled', 'returned', 'refunded'], true);
                $this->db->prepare(
                    'UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id'
                )->execute(['status' => 'returned', 'id' => $orderId]);
                if (!$alreadyRestored) {
                    $this->orderModel->restoreStock($orderId);
                }
            }

            if ($status === 'completed' && $markRefunded) {
                $this->db->prepare(
                    'UPDATE orders SET payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
                )->execute(['payment_status' => 'refunded', 'id' => $orderId]);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Admin return update failed: ' . $e->getMessage());
            Response::jsonError('Could not update return.', 500);
        }

        $titles = [
            'in_process' => 'Return in process',
            'rejected' => 'Return rejected',
            'completed' => 'Return completed',
        ];
        $messages = [
            'in_process' => "Your return for order {$order['order_number']} is being processed.",
            'rejected' => "Your return request for order {$order['order_number']} was not approved.",
            'completed' => "Your return for order {$order['order_number']} has been completed.",
        ];
        if ($status === 'completed' && $markRefunded) {
            $messages['completed'] = "Your return for order {$order['order_number']} is complete and a refund has been recorded.";
        }

        $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_at)
             VALUES (:user_id, :title, :message, :type, NOW())'
        )->execute([
            'user_id' => $order['user_id'],
            'title' => $titles[$status] ?? 'Return update',
            'message' => $messages[$status] ?? 'Your return was updated.',
            'type' => 'order',
        ]);

        $emailResult = ['sent' => false, 'message' => 'Email not requested.'];
        if ($notifyCustomer) {
            try {
                if ($status === 'completed' && $markOrderReturned) {
                    $emailResult = (new OrderMailService($this->db))->notifyStatusUpdate(
                        $orderId,
                        $markRefunded ? 'refunded' : 'returned'
                    );
                } else {
                    $emailResult = (new OrderMailService($this->db))->notifyReturnUpdate(
                        $orderId,
                        $status,
                        $adminNotes
                    );
                }
            } catch (Throwable $e) {
                error_log('Return email failed: ' . $e->getMessage());
                $emailResult = ['sent' => false, 'message' => 'Failed to send return email.'];
            }
        }

        $fresh = $this->orderModel->findById($orderId);
        $freshReturn = $this->orderModel->getLatestReturn($orderId);

        Response::jsonSuccess([
            'return' => $freshReturn,
            'order_status' => $fresh['status'] ?? $previousOrderStatus,
            'payment_status' => $fresh['payment_status'] ?? $order['payment_status'],
            'email_sent' => (bool) ($emailResult['sent'] ?? false),
            'email_message' => (string) ($emailResult['message'] ?? ''),
        ], 'Return updated.');
    }

    /** Admin reply in the shared order help thread. */
    public function sendHelp(array $params): void
    {
        $input = $this->getJsonInput();
        $orderId = (int) $params['id'];
        $message = trim((string) ($input['message'] ?? ''));

        if ($message === '') {
            Response::jsonError('Enter a reply for the customer.', 422);
        }

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        try {
            $id = $this->orderModel->addHelpMessage(
                $orderId,
                (int) $order['user_id'],
                'admin',
                $message
            );
        } catch (Throwable $e) {
            error_log('Admin order help reply failed: ' . $e->getMessage());
            Response::jsonError('Could not send reply.', 500);
        }

        $this->db->prepare(
            'INSERT INTO notifications (user_id, title, message, type, created_at)
             VALUES (:user_id, :title, :message, :type, NOW())'
        )->execute([
            'user_id' => $order['user_id'],
            'title' => 'Update from YULO',
            'message' => "YULO replied about order {$order['order_number']}.",
            'type' => 'order',
        ]);

        Response::jsonSuccess([
            'id' => $id,
            'help_messages' => $this->orderModel->getHelpMessages($orderId),
        ], 'Reply shared with customer.');
    }

    /**
     * Create Shiprocket adhoc order → assign AWB → save delivery + optional shipped email.
     * Body: notify_customer (default true), mark_shipped (default true), request_pickup (default true).
     */
    public function createShiprocketShipment(array $params): void
    {
        $input = $this->getJsonInput();
        $orderId = (int) $params['id'];
        $notifyCustomer = !array_key_exists('notify_customer', $input) || !empty($input['notify_customer']);
        $markShipped = !array_key_exists('mark_shipped', $input) || !empty($input['mark_shipped']);
        $requestPickup = !array_key_exists('request_pickup', $input) || !empty($input['request_pickup']);

        $client = new ShiprocketClient($this->db);
        if (!$client->isEnabled()) {
            Response::jsonError(
                'Shiprocket is not enabled. Configure and enable it under Admin → Shiprocket.',
                422
            );
        }

        $order = $this->orderModel->findById($orderId);
        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $blocked = ['cancelled', 'returned', 'refunded'];
        if (in_array((string) ($order['status'] ?? ''), $blocked, true)) {
            Response::jsonError('Cannot create a shipment for a cancelled/returned/refunded order.', 422);
        }

        $existingDel = $this->db->prepare(
            'SELECT id, tracking_number, notes FROM deliveries WHERE order_id = :order_id ORDER BY id DESC LIMIT 1'
        );
        $existingDel->execute(['order_id' => $orderId]);
        $existingDelivery = $existingDel->fetch() ?: null;
        if ($existingDelivery && trim((string) ($existingDelivery['tracking_number'] ?? '')) !== '') {
            Response::jsonError(
                'This order already has tracking '
                . trim((string) $existingDelivery['tracking_number'])
                . '. Use Share Tracking to update it, or clear tracking first.',
                422
            );
        }

        $items = $this->orderModel->getItems($orderId);
        if ($items === []) {
            Response::jsonError('Order has no items to ship.', 422);
        }

        $shipping = json_decode((string) ($order['shipping_address'] ?? '{}'), true);
        if (!is_array($shipping)) {
            $shipping = [];
        }

        $fullName = trim((string) ($shipping['name'] ?? $order['customer_name'] ?? 'Customer'));
        $nameParts = preg_split('/\s+/', $fullName, 2) ?: [$fullName];
        $firstName = trim((string) ($nameParts[0] ?? 'Customer')) ?: 'Customer';
        $lastName = trim((string) ($nameParts[1] ?? ''));

        $phone = preg_replace('/\D+/', '', (string) ($shipping['phone'] ?? '')) ?: '';
        $phone = substr($phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('Order shipping address needs a valid 10-digit phone for Shiprocket.', 422);
        }

        $pincode = preg_replace('/\D+/', '', (string) ($shipping['pincode'] ?? '')) ?: '';
        if (strlen($pincode) !== 6) {
            Response::jsonError('Order shipping address needs a valid 6-digit pincode for Shiprocket.', 422);
        }

        $addressLine = trim(
            (string) ($shipping['address_line1'] ?? '')
            . (trim((string) ($shipping['address_line2'] ?? '')) !== ''
                ? ', ' . trim((string) $shipping['address_line2'])
                : '')
        );
        if ($addressLine === '') {
            Response::jsonError('Order shipping address is incomplete.', 422);
        }

        $city = trim((string) ($shipping['city'] ?? ''));
        $state = trim((string) ($shipping['state'] ?? ''));
        if ($city === '' || $state === '') {
            Response::jsonError('Order shipping city/state is required for Shiprocket.', 422);
        }

        $email = trim((string) ($order['customer_email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Response::jsonError('Customer email is required for Shiprocket shipment.', 422);
        }

        $isCod = strtolower((string) ($order['payment_method'] ?? '')) === 'cod';
        $paymentMethod = $isCod ? 'COD' : 'Prepaid';

        $orderItems = [];
        $unitsTotal = 0;
        foreach ($items as $item) {
            $qty = max(1, (int) ($item['quantity'] ?? 1));
            $unitsTotal += $qty;
            $sku = 'YULO-' . (int) ($item['product_id'] ?? 0);
            if (!empty($item['variant_id'])) {
                $sku .= '-V' . (int) $item['variant_id'];
            }
            $name = trim((string) ($item['product_name'] ?? 'Item'));
            $meta = array_filter([
                trim((string) ($item['color'] ?? '')) !== '' ? 'Color: ' . $item['color'] : '',
                trim((string) ($item['size'] ?? '')) !== '' ? 'Size: ' . $item['size'] : '',
            ]);
            if ($meta !== []) {
                $name .= ' (' . implode(', ', $meta) . ')';
            }

            $orderItems[] = [
                'name' => mb_substr($name, 0, 200),
                'sku' => $sku,
                'units' => $qty,
                'selling_price' => (string) round((float) ($item['price'] ?? 0), 2),
            ];
        }

        // Fashion parcel defaults — Shiprocket requires dimensions + weight.
        $weightKg = max(0.5, round($unitsTotal * 0.4, 2));
        $length = 28;
        $breadth = 20;
        $height = max(5, min(40, (int) ceil($unitsTotal * 3)));

        $orderDate = (string) ($order['created_at'] ?? date('Y-m-d H:i'));
        if (preg_match('/^\d{4}-\d{2}-\d{2}/', $orderDate) === 1) {
            $orderDate = substr($orderDate, 0, 16);
        } else {
            $orderDate = date('Y-m-d H:i');
        }

        $srOrderRef = substr((string) $order['order_number'], 0, 45);
        $payload = [
            'order_id' => $srOrderRef,
            'order_date' => $orderDate,
            'pickup_location' => $client->getPickupLocation(),
            'billing_customer_name' => $firstName,
            'billing_last_name' => $lastName,
            'billing_address' => mb_substr($addressLine, 0, 190),
            'billing_city' => $city,
            'billing_pincode' => $pincode,
            'billing_state' => $state,
            'billing_country' => trim((string) ($shipping['country'] ?? 'India')) ?: 'India',
            'billing_email' => $email,
            'billing_phone' => $phone,
            'shipping_is_billing' => true,
            'order_items' => $orderItems,
            'payment_method' => $paymentMethod,
            'sub_total' => round((float) ($order['subtotal'] ?? $order['total'] ?? 0), 2),
            'length' => $length,
            'breadth' => $breadth,
            'height' => $height,
            'weight' => $weightKg,
        ];

        if ($client->getChannelId() !== '') {
            $payload['channel_id'] = $client->getChannelId();
        }

        $created = $client->createAdhocOrder($payload);
        if (!$created['ok']) {
            // Duplicate order_id on Shiprocket — retry once with a unique suffix.
            $msg = strtolower((string) ($created['message'] ?? ''));
            if (str_contains($msg, 'already') || str_contains($msg, 'duplicate') || str_contains($msg, 'exist')) {
                $payload['order_id'] = substr($srOrderRef . '-' . substr((string) time(), -5), 0, 50);
                $created = $client->createAdhocOrder($payload);
            }
        }
        if (!$created['ok']) {
            Response::jsonError($created['message'] ?: 'Could not create Shiprocket order.', 422, $created['data'] ?? []);
        }

        $shipmentId = (int) ($created['shipment_id'] ?? 0);
        $srOrderId = (int) ($created['shiprocket_order_id'] ?? 0);

        $courierId = null;
        $courierHint = '';
        $pickupMeta = $client->resolvePickupPincode();
        if (!empty($pickupMeta['ok']) && !empty($pickupMeta['pincode'])) {
            $best = $client->getBestCourier(
                (string) $pickupMeta['pincode'],
                $pincode,
                $weightKg,
                $isCod
            );
            if (!empty($best['ok'])) {
                $courierId = (int) ($best['courier_id'] ?? 0) ?: null;
                $courierHint = (string) ($best['courier_name'] ?? '');
            }
        }

        $awbResult = $client->assignAwb($shipmentId, $courierId);
        if (!$awbResult['ok'] && $courierId !== null) {
            // Retry with Shiprocket auto-select if preferred courier failed.
            $awbResult = $client->assignAwb($shipmentId, null);
        }
        if (!$awbResult['ok']) {
            Response::jsonError(
                'Shiprocket order created (shipment #' . $shipmentId
                . ') but AWB assignment failed: '
                . ($awbResult['message'] ?: 'unknown error')
                . '. Complete AWB in the Shiprocket panel, then use Share Tracking.',
                422,
                [
                    'shiprocket_order_id' => $srOrderId,
                    'shipment_id' => $shipmentId,
                    'awb_error' => $awbResult['data'] ?? [],
                ]
            );
        }

        $awb = (string) ($awbResult['awb'] ?? '');
        $carrier = trim((string) ($awbResult['courier_name'] ?? $courierHint)) ?: 'Shiprocket';

        $pickupResult = ['ok' => false, 'message' => 'Pickup not requested.'];
        if ($requestPickup) {
            $pickupResult = $client->requestPickup([$shipmentId]);
        }

        $notes = json_encode([
            'source' => 'shiprocket',
            'shiprocket_order_id' => $srOrderId,
            'shipment_id' => $shipmentId,
            'awb' => $awb,
            'pickup_requested' => !empty($pickupResult['ok']),
            'pickup_message' => (string) ($pickupResult['message'] ?? ''),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($existingDelivery) {
            $this->db->prepare(
                'UPDATE deliveries
                 SET carrier = :carrier, tracking_number = :tracking_number, status = :status,
                     notes = :notes, updated_at = NOW()
                 WHERE id = :id'
            )->execute([
                'carrier' => $carrier,
                'tracking_number' => $awb,
                'status' => 'in_transit',
                'notes' => $notes,
                'id' => (int) $existingDelivery['id'],
            ]);
            $deliveryId = (int) $existingDelivery['id'];
        } else {
            $this->db->prepare(
                'INSERT INTO deliveries (order_id, carrier, tracking_number, status, notes, created_at, updated_at)
                 VALUES (:order_id, :carrier, :tracking_number, :status, :notes, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'carrier' => $carrier,
                'tracking_number' => $awb,
                'status' => 'in_transit',
                'notes' => $notes,
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
            'message' => "Tracking for order {$order['order_number']}: {$awb}",
            'type' => 'order',
        ]);

        $emailResult = ['sent' => false, 'message' => 'Email not requested.', 'track_url' => null];
        if ($notifyCustomer) {
            try {
                $emailResult = (new OrderMailService($this->db))->notifyTrackingShared(
                    $orderId,
                    $awb,
                    $carrier
                );
            } catch (Throwable $e) {
                error_log('Shiprocket tracking email failed: ' . $e->getMessage());
                $emailResult = ['sent' => false, 'message' => 'Failed to send tracking email.', 'track_url' => null];
            }
        }

        $message = 'Shiprocket shipment created with AWB ' . $awb . '.';
        if ($requestPickup && empty($pickupResult['ok'])) {
            $message .= ' Pickup request failed — schedule pickup in Shiprocket if needed.';
        }

        Response::jsonSuccess([
            'delivery_id' => $deliveryId,
            'tracking_number' => $awb,
            'carrier' => $carrier,
            'shiprocket_order_id' => $srOrderId,
            'shipment_id' => $shipmentId,
            'pickup_requested' => !empty($pickupResult['ok']),
            'pickup_message' => (string) ($pickupResult['message'] ?? ''),
            'email_sent' => (bool) ($emailResult['sent'] ?? false),
            'email_message' => (string) ($emailResult['message'] ?? ''),
            'track_url' => $emailResult['track_url'] ?? null,
        ], $message);
    }
}

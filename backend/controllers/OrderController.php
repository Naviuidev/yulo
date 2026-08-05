<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class OrderController extends BaseController
{
    private Order $orderModel;
    private Cart $cartModel;

    public function __construct()
    {
        parent::__construct();
        $this->orderModel = new Order($this->db);
        $this->cartModel = new Cart($this->db);
    }

    public function index(array $params = []): void
    {
        $userId = $this->authUserId();
        $pagination = Pagination::resolve();
        $result = $this->orderModel->listByUser($userId, $pagination['limit'], $pagination['offset']);
        Response::jsonPaginate($result['items'], $result['total'], $pagination['page'], $pagination['per_page']);
    }

    public function show(array $params): void
    {
        $userId = $this->authUserId();
        $order = $this->orderModel->findById((int) $params['id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $order['items'] = $this->orderModel->getItems((int) $order['id']);

        $payStmt = $this->db->prepare('SELECT * FROM payments WHERE order_id = :order_id ORDER BY created_at DESC');
        $payStmt->execute(['order_id' => $order['id']]);
        $order['payments'] = $payStmt->fetchAll();

        Response::jsonSuccess($order);
    }

    public function create(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $cartId = $this->cartModel->getOrCreate($userId);
        $items = $this->cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $subtotal = 0;
        foreach ($items as $item) {
            $price = $item['variant_id']
                ? ($item['variant_sale_price'] ?? $item['variant_price'])
                : ($item['sale_price'] ?? $item['price']);
            $subtotal += (float) $price * (int) $item['quantity'];
        }

        $discount = 0;
        $couponId = null;

        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode($input['coupon_code']);

            if ($coupon && ($coupon['expires_at'] === null || strtotime($coupon['expires_at']) > time())) {
                if ($coupon['min_order_amount'] <= $subtotal) {
                    $discount = $coupon['type'] === 'percentage'
                        ? $subtotal * ($coupon['value'] / 100)
                        : (float) $coupon['value'];
                    $discount = min($discount, $subtotal);
                    $couponId = $coupon['id'];
                }
            }
        }

        $shipping = (float) ($input['shipping_charge'] ?? 0);
        $tax = round(($subtotal - $discount) * 0.18, 2);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        try {
            $this->db->beginTransaction();

            $paymentMethod = $input['payment_method'] ?? 'cod';
            $allowedMethods = ['phonepe', 'stripe', 'cod', 'upi'];
            if (!in_array($paymentMethod, $allowedMethods, true)) {
                $paymentMethod = 'cod';
            }

            $orderNumber = $this->orderModel->generateOrderNumber();
            $stmt = $this->db->prepare(
                'INSERT INTO orders (user_id, order_number, status, subtotal, discount, shipping_charge, tax, total,
                                     coupon_id, payment_status, payment_method, shipping_address, billing_address, notes, created_at, updated_at)
                 VALUES (:user_id, :order_number, :status, :subtotal, :discount, :shipping, :tax, :total,
                         :coupon_id, :payment_status, :payment_method, :shipping_address, :billing_address, :notes, NOW(), NOW())'
            );
            $stmt->execute([
                'user_id' => $userId,
                'order_number' => $orderNumber,
                'status' => 'pending',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'coupon_id' => $couponId,
                'payment_status' => $paymentMethod === 'cod' ? 'pending' : 'pending',
                'payment_method' => $paymentMethod,
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, NOW())'
            );

            foreach ($items as $item) {
                $price = $item['variant_id']
                    ? ($item['variant_sale_price'] ?? $item['variant_price'])
                    : ($item['sale_price'] ?? $item['price']);
                $lineTotal = (float) $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                ]);

                if ($item['variant_id']) {
                    $stockStmt = $this->db->prepare('UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :qty');
                    $stockStmt->execute(['qty' => $item['quantity'], 'id' => $item['variant_id']]);
                } else {
                    $stockStmt = $this->db->prepare('UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :qty');
                    $stockStmt->execute(['qty' => $item['quantity'], 'id' => $item['product_id']]);
                }
            }

            if ($couponId) {
                $couponModel = new Coupon($this->db);
                $couponModel->incrementUsage($couponId);
            }

            $this->cartModel->clear($cartId);
            $this->db->commit();

            Response::jsonSuccess([
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'total' => $total,
            ], 'Order created successfully.', 201);
        } catch (Throwable $e) {
            $this->db->rollBack();
            error_log('Order creation failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }
    }

    public function cancel(array $params): void
    {
        $userId = $this->authUserId();
        $order = $this->orderModel->findById((int) $params['id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if (!in_array($order['status'], ['pending', 'confirmed'], true)) {
            Response::jsonError('Order cannot be cancelled at this stage.', 422);
        }

        $stmt = $this->db->prepare('UPDATE orders SET status = :status, updated_at = NOW() WHERE id = :id');
        $stmt->execute(['status' => 'cancelled', 'id' => $order['id']]);

        Response::jsonSuccess(null, 'Order cancelled.');
    }

    public function track(array $params): void
    {
        $userId = $this->authUserId();
        $order = $this->orderModel->findById((int) $params['id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $stmt = $this->db->prepare(
            'SELECT * FROM deliveries WHERE order_id = :order_id ORDER BY created_at DESC LIMIT 1'
        );
        $stmt->execute(['order_id' => $order['id']]);
        $delivery = $stmt->fetch();

        Response::jsonSuccess([
            'order_number' => $order['order_number'],
            'status' => $order['status'],
            'delivery' => $delivery,
        ]);
    }

    public function trackByNumber(array $params): void
    {
        $orderNumber = trim($params['order_number'] ?? '');
        $email = trim($_GET['email'] ?? '');

        if ($orderNumber === '' || $email === '') {
            Response::jsonError('Order number and email are required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT o.id, o.order_number, o.status, o.payment_status, o.payment_method, o.total, o.created_at
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.order_number = :order_number AND u.email = :email
             LIMIT 1'
        );
        $stmt->execute([
            'order_number' => $orderNumber,
            'email' => strtolower($email),
        ]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $deliveryStmt = $this->db->prepare(
            'SELECT carrier, tracking_number, status, estimated_delivery, otp
             FROM deliveries WHERE order_id = :order_id ORDER BY created_at DESC LIMIT 1'
        );
        $deliveryStmt->execute(['order_id' => $order['id']]);

        Response::jsonSuccess([
            'order_number' => $order['order_number'],
            'status' => $order['status'],
            'payment_status' => $order['payment_status'],
            'payment_method' => $order['payment_method'],
            'total' => $order['total'],
            'created_at' => $order['created_at'],
            'delivery' => $deliveryStmt->fetch() ?: null,
        ]);
    }

    public function invoice(array $params): void
    {
        $userId = $this->authUserId();
        $order = $this->orderModel->findById((int) $params['id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        $order['items'] = $this->orderModel->getItems((int) $order['id']);
        $order['shipping_address'] = json_decode($order['shipping_address'] ?? '{}', true);
        $order['billing_address'] = json_decode($order['billing_address'] ?? '{}', true);

        Response::jsonSuccess($order, 'Invoice data retrieved.');
    }
}

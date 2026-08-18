<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class CheckoutController extends BaseController
{
    public function summary(array $params = []): void
    {
        $userId = $this->authUserId();
        $cartModel = new Cart($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        $subtotal = 0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $shipping = Pricing::shippingFromItems($items, (float) $subtotal, 999.0, 49.0);
        $tax = Pricing::gstTaxFromItems($items, 0.0);

        $codAvailable = $items !== [] && array_reduce(
            $items,
            static fn (bool $ok, array $item): bool => $ok && (int) ($item['cod_available'] ?? 1) === 1,
            true
        );

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE user_id = :user_id ORDER BY is_default DESC');
        $addrStmt->execute(['user_id' => $userId]);

        Response::jsonSuccess([
            'items' => $items,
            'addresses' => $addrStmt->fetchAll(),
            'summary' => [
                'subtotal' => round($subtotal, 2),
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => round($subtotal + $shipping + $tax, 2),
                'cod_available' => $codAvailable,
            ],
        ]);
    }

    /**
     * Authenticated Pay Now: create order + Cashfree session in one step.
     * Cart is cleared only after Cashfree accepts the payment session.
     * If Cashfree fails, the order is cancelled and stock is restored.
     */
    public function payCashfree(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $client = new CashfreeClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Cashfree is not configured. Add App ID and Secret Key under Admin → Payments.', 422);
        }

        if (PaymentGatewaySettings::getPublished($this->db) !== 'cashfree') {
            Response::jsonError('Easy Cash is not published. Publish it under Admin → Payments to collect payments on the website.', 422);
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
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
                'payment_status' => 'pending',
                'payment_method' => 'cashfree',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            // Do not clear cart until Cashfree session is created.
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Cashfree checkout order create failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'http://localhost:5173';
        }

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];

        $customerName = (string) ($address['name'] ?? $address['full_name'] ?? $user['name'] ?? 'Customer');
        $customerEmail = (string) ($user['email'] ?? '');
        if ($customerEmail === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $customerEmail = 'user' . $userId . '@yulo.local';
        }

        $orderMeta = [
            'return_url' => $frontendUrl . '/payment/cashfree/return?order_id={order_id}',
        ];
        $notifyUrl = $client->getNotifyUrl();
        if ($notifyUrl) {
            $orderMeta['notify_url'] = $notifyUrl;
        }

        $payload = [
            'order_id' => $orderNumber,
            'order_amount' => $total,
            'order_currency' => 'INR',
            'customer_details' => [
                'customer_id' => 'user_' . $userId,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $phone,
            ],
            'order_meta' => $orderMeta,
            'order_note' => 'YULO order #' . $orderId,
        ];

        $result = $client->createOrder($payload);
        if (!$result['ok']) {
            error_log('Cashfree create order failed: ' . $result['message'] . ' ' . json_encode($result['data']));
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError($result['message'] ?: 'Unable to start Cashfree payment.', 422, is_array($result['data']) ? $result['data'] : []);
        }

        $sessionId = (string) ($result['data']['payment_session_id'] ?? '');
        if ($sessionId === '') {
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError('Cashfree did not return a payment session.', 502, $result['data']);
        }

        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'cashfree',
                'transaction_id' => $orderNumber,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode([
                    'payment_session_id' => $sessionId,
                    'cashfree_response' => $result['data'],
                    'env' => $client->getEnv(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $paymentId = (int) $this->db->lastInsertId();
            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Cashfree payment record failed: ' . $e->getMessage());
            // Session exists on Cashfree — still return it so checkout can proceed.
            $paymentId = 0;
        }

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'payment_session_id' => $sessionId,
            'env' => $client->getEnv(),
            'return_url' => $frontendUrl . '/payment/cashfree/return?order_id=' . rawurlencode($orderNumber),
            'total' => $total,
        ], 'Cashfree payment ready.');
    }

    /** Create order + PhonePe Standard Checkout v2 redirect. */
    public function payPhonePe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $client = new PhonePeClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('PhonePe is not configured. Add Client ID and Client Secret under Admin → Payments.', 422);
        }

        if (PaymentGatewaySettings::getPublished($this->db) !== 'phonepe') {
            Response::jsonError('PhonePe is not published. Publish it under Admin → Payments to collect payments on the website.', 422);
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
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
                'payment_status' => 'pending',
                'payment_method' => 'phonepe',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('PhonePe checkout order create failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'http://localhost:5173';
        }

        $merchantOrderId = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $orderNumber);
        if ($merchantOrderId === '') {
            $merchantOrderId = 'YULO' . $orderId . 'T' . time();
        }

        $redirectUrl = $frontendUrl . '/payment/phonepe/return?order_id=' . rawurlencode($merchantOrderId);
        $amountPaise = (int) round($total * 100);

        $result = $client->createPayment([
            'merchantOrderId' => $merchantOrderId,
            'amount' => $amountPaise,
            'redirectUrl' => $redirectUrl,
            'message' => 'YULO order #' . $orderNumber,
        ]);

        if (!$result['ok']) {
            error_log('PhonePe create payment failed: ' . $result['message'] . ' ' . json_encode($result['data']));
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError($result['message'] ?: 'Unable to start PhonePe payment.', 422, is_array($result['data']) ? $result['data'] : []);
        }

        $redirectPayUrl = (string) ($result['data']['redirectUrl'] ?? '');
        if ($redirectPayUrl === '') {
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError('PhonePe did not return a payment URL.', 502, $result['data']);
        }

        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'phonepe',
                'transaction_id' => $merchantOrderId,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode([
                    'phonepe_response' => $result['data'],
                    'env' => $client->getEnv(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $paymentId = (int) $this->db->lastInsertId();
            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('PhonePe payment record failed: ' . $e->getMessage());
            $paymentId = 0;
        }

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'merchant_order_id' => $merchantOrderId,
            'redirect_url' => $redirectPayUrl,
            'env' => $client->getEnv(),
            'return_url' => $redirectUrl,
            'total' => $total,
        ], 'PhonePe payment ready.');
    }

    /** Create order + Paytm JS Checkout txn token. */
    public function payPaytm(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $client = new PaytmClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Paytm is not configured. Add Merchant ID and Merchant Key under Admin → Payments.', 422);
        }

        if (PaymentGatewaySettings::getPublished($this->db) !== 'paytm') {
            Response::jsonError('Paytm is not published. Publish it under Admin → Payments to collect payments on the website.', 422);
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
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
                'payment_status' => 'pending',
                'payment_method' => 'paytm',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Paytm checkout order create failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'http://localhost:5173';
        }

        $paytmOrderId = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $orderNumber);
        if ($paytmOrderId === '') {
            $paytmOrderId = 'YULO' . $orderId . 'T' . time();
        }

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];
        $customerEmail = (string) ($user['email'] ?? '');
        if ($customerEmail === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $customerEmail = 'user' . $userId . '@yulo.local';
        }

        $callbackUrl = $frontendUrl . '/payment/paytm/return?order_id=' . rawurlencode($paytmOrderId);

        $result = $client->initiateTransaction([
            'orderId' => $paytmOrderId,
            'amount' => $total,
            'customerId' => 'user_' . $userId,
            'callbackUrl' => $callbackUrl,
            'mobile' => $phone,
            'email' => $customerEmail,
        ]);

        if (!$result['ok'] || empty($result['txn_token'])) {
            error_log('Paytm initiate failed: ' . $result['message'] . ' ' . json_encode($result['data']));
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError($result['message'] ?: 'Unable to start Paytm payment.', 422, is_array($result['data']) ? $result['data'] : []);
        }

        $txnToken = (string) $result['txn_token'];
        $amountStr = number_format($total, 2, '.', '');

        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'paytm',
                'transaction_id' => $paytmOrderId,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode([
                    'paytm_response' => $result['data'],
                    'txn_token' => $txnToken,
                    'env' => $client->getEnv(),
                    'mid' => $client->getMid(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $paymentId = (int) $this->db->lastInsertId();
            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Paytm payment record failed: ' . $e->getMessage());
            $paymentId = 0;
        }

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'paytm_order_id' => $paytmOrderId,
            'txn_token' => $txnToken,
            'amount' => $amountStr,
            'mid' => $client->getMid(),
            'env' => $client->getEnv(),
            'checkout_js_url' => $client->checkoutJsUrl(),
            'return_url' => $callbackUrl,
            'total' => $total,
        ], 'Paytm payment ready.');
    }

    /** Create order + Razorpay Checkout order. */
    public function payRazorpay(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $client = new RazorpayClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Razorpay is not configured. Add Key ID and Key Secret under Admin → Payments.', 422);
        }

        if (PaymentGatewaySettings::getPublished($this->db) !== 'razorpay') {
            Response::jsonError('Razorpay is not published. Publish it under Admin → Payments to collect payments on the website.', 422);
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
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
                'payment_status' => 'pending',
                'payment_method' => 'razorpay',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Razorpay checkout order create failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];
        $customerName = (string) ($address['name'] ?? $address['full_name'] ?? $user['name'] ?? 'Customer');
        $customerEmail = (string) ($user['email'] ?? '');
        if ($customerEmail === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $customerEmail = 'user' . $userId . '@yulo.local';
        }

        $amountPaise = (int) round($total * 100);
        $receipt = preg_replace('/[^A-Za-z0-9]/', '', (string) $orderNumber);
        if ($receipt === '') {
            $receipt = 'YULO' . $orderId;
        }
        $receipt = substr($receipt, 0, 40);

        $result = $client->createOrder([
            'amount' => $amountPaise,
            'receipt' => $receipt,
            'notes' => [
                'yulo_order_id' => (string) $orderId,
                'yulo_order_number' => (string) $orderNumber,
            ],
        ]);

        if (!$result['ok'] || empty($result['order_id'])) {
            error_log('Razorpay create order failed: ' . $result['message'] . ' ' . json_encode($result['data']));
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError($result['message'] ?: 'Unable to start Razorpay payment.', 422, is_array($result['data']) ? $result['data'] : []);
        }

        $razorpayOrderId = (string) $result['order_id'];

        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'razorpay',
                'transaction_id' => $razorpayOrderId,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode([
                    'razorpay_response' => $result['data'],
                    'env' => $client->getEnv(),
                    'key_id' => $client->getKeyId(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $paymentId = (int) $this->db->lastInsertId();
            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Razorpay payment record failed: ' . $e->getMessage());
            $paymentId = 0;
        }

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'razorpay_order_id' => $razorpayOrderId,
            'amount' => $amountPaise,
            'currency' => 'INR',
            'key_id' => $client->getKeyId(),
            'env' => $client->getEnv(),
            'prefill' => [
                'name' => $customerName,
                'email' => $customerEmail,
                'contact' => $phone,
            ],
            'total' => $total,
        ], 'Razorpay payment ready.');
    }

    /** Create order + PayU Hosted Checkout form fields. */
    public function payPayU(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $client = new PayUClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('PayU is not configured. Add Merchant Key and Merchant Salt under Admin → Payments.', 422);
        }

        if (PaymentGatewaySettings::getPublished($this->db) !== 'payu') {
            Response::jsonError('PayU is not published. Publish it under Admin → Payments to collect payments on the website.', 422);
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
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
                'payment_status' => 'pending',
                'payment_method' => 'payu',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('PayU checkout order create failed: ' . $e->getMessage());
            Response::jsonError('Failed to create order.', 500);
        }

        $txnid = preg_replace('/[^A-Za-z0-9_-]/', '', (string) $orderNumber);
        if ($txnid === '') {
            $txnid = 'YULO' . $orderId . 'T' . time();
        }

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];
        $customerEmail = (string) ($user['email'] ?? '');
        if ($customerEmail === '' || !filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            $customerEmail = 'user' . $userId . '@yulo.local';
        }
        $customerName = trim((string) ($user['name'] ?? $address['full_name'] ?? $address['name'] ?? 'Customer'));
        if ($customerName === '') {
            $customerName = 'Customer';
        }
        $firstname = preg_replace('/\s+/', ' ', $customerName);
        $firstname = trim((string) explode(' ', $firstname)[0]);
        if ($firstname === '') {
            $firstname = 'Customer';
        }

        $callbackUrl = PayUClient::suggestedCallbackUrl();
        $form = $client->buildCheckoutForm([
            'txnid' => $txnid,
            'amount' => $total,
            'productinfo' => 'Order ' . $orderNumber,
            'firstname' => $firstname,
            'email' => $customerEmail,
            'phone' => $phone,
            'surl' => $callbackUrl,
            'furl' => $callbackUrl,
            'udf1' => (string) $orderId,
        ]);

        if (!$form['ok'] || empty($form['params'])) {
            error_log('PayU form build failed: ' . ($form['message'] ?? ''));
            $this->rollbackUnpaidCashfreeOrder($orderId);
            Response::jsonError($form['message'] ?: 'Unable to start PayU payment.', 422);
        }

        $paymentId = 0;
        try {
            $this->db->beginTransaction();

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'payu',
                'transaction_id' => $txnid,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode([
                    'env' => $client->getEnv(),
                    'surl' => $callbackUrl,
                    'productinfo' => 'Order ' . $orderNumber,
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $paymentId = (int) $this->db->lastInsertId();
            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('PayU payment record failed: ' . $e->getMessage());
        }

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'txnid' => $txnid,
            'amount' => number_format($total, 2, '.', ''),
            'env' => $client->getEnv(),
            'action' => $form['action'],
            'params' => $form['params'],
            'total' => $total,
        ], 'PayU payment ready.');
    }

    /**
     * Place Cash on Delivery order when every cart product has cod_available enabled.
     */
    public function payCod(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        SchemaGuard::ensureCashfreePaymentMethod($this->db);
        SchemaGuard::ensureProductCommerceOptions($this->db);

        $validator = Validator::make($input)->required('shipping_address_id')->integer('shipping_address_id');
        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        $cartModel = new Cart($this->db);
        $orderModel = new Order($this->db);
        $cartId = $cartModel->getOrCreate($userId);
        $items = $cartModel->getItems($cartId);

        if (empty($items)) {
            Response::jsonError('Cart is empty.', 422);
        }

        foreach ($items as $item) {
            if ((int) ($item['cod_available'] ?? 1) !== 1) {
                Response::jsonError(
                    'Cash on Delivery is not available for one or more products in your cart. Please pay online.',
                    422
                );
            }
        }

        $addrStmt = $this->db->prepare('SELECT * FROM addresses WHERE id = :id AND user_id = :user_id LIMIT 1');
        $addrStmt->execute(['id' => $input['shipping_address_id'], 'user_id' => $userId]);
        $address = $addrStmt->fetch();

        if (!$address) {
            Response::jsonError('Shipping address not found.', 404);
        }

        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address.', 422);
        }

        $subtotal = 0.0;
        foreach ($items as $item) {
            $subtotal += Pricing::unitPriceFromItem($item) * (int) $item['quantity'];
        }

        $discount = 0.0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($items, $subtotal);
        $tax = Pricing::gstTaxFromItems($items, $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);

        $orderId = 0;
        $orderNumber = '';

        try {
            $this->db->beginTransaction();

            $orderNumber = $orderModel->generateOrderNumber();
            $stmt = $this->db->prepare(
                'INSERT INTO orders (user_id, order_number, status, subtotal, discount, shipping_charge, tax, total,
                                     coupon_id, payment_status, payment_method, shipping_address, billing_address, notes, created_at, updated_at)
                 VALUES (:user_id, :order_number, :status, :subtotal, :discount, :shipping, :tax, :total,
                         :coupon_id, :payment_status, :payment_method, :shipping_address, :billing_address, :notes, NOW(), NOW())'
            );
            $stmt->execute([
                'user_id' => $userId,
                'order_number' => $orderNumber,
                'status' => 'confirmed',
                'subtotal' => $subtotal,
                'discount' => $discount,
                'shipping' => $shipping,
                'tax' => $tax,
                'total' => $total,
                'coupon_id' => $couponId,
                'payment_status' => 'pending',
                'payment_method' => 'cod',
                'shipping_address' => json_encode($address),
                'billing_address' => json_encode($input['billing_address'] ?? $address),
                'notes' => $input['notes'] ?? null,
            ]);

            $orderId = (int) $this->db->lastInsertId();

            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($items as $item) {
                $variantId = !empty($item['variant_id']) ? (int) $item['variant_id'] : null;
                $price = Pricing::unitPriceFromItem($item);
                $lineTotal = $price * (int) $item['quantity'];

                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => (int) $item['product_id'],
                    'variant_id' => $variantId,
                    'quantity' => (int) $item['quantity'],
                    'price' => $price,
                    'total' => $lineTotal,
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if ($variantId) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => $variantId,
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            )->execute([
                'order_id' => $orderId,
                'gateway' => 'cod',
                'transaction_id' => $orderNumber,
                'amount' => $total,
                'status' => 'initiated',
                'metadata' => json_encode(['method' => 'cod'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);

            $cartModel->clear($cartId);
            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('COD checkout failed: ' . $e->getMessage());
            Response::jsonError('Failed to place COD order.', 500);
        }

        try {
            (new OrderMailService($this->db))->notifyCodOrder($orderId);
        } catch (Throwable $e) {
            error_log('Order email notify failed (cod): ' . $e->getMessage());
        }

        Response::jsonSuccess([
            'order_id' => $orderId,
            'order_number' => $orderNumber,
            'payment_method' => 'cod',
            'payment_status' => 'pending',
            'status' => 'confirmed',
            'total' => $total,
        ], 'COD order placed. Pay when your order is delivered.');
    }

    /** Cancel unpaid order and restore stock after Cashfree session creation fails. */
    private function rollbackUnpaidCashfreeOrder(int $orderId): void
    {
        if ($orderId <= 0) {
            return;
        }

        try {
            $this->db->beginTransaction();

            $itemsStmt = $this->db->prepare(
                'SELECT product_id, variant_id, quantity FROM order_items WHERE order_id = :order_id'
            );
            $itemsStmt->execute(['order_id' => $orderId]);
            $items = $itemsStmt->fetchAll();

            foreach ($items as $item) {
                $qty = (int) $item['quantity'];
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

            $this->db->prepare(
                'UPDATE orders SET status = :status, payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'cancelled',
                'payment_status' => 'failed',
                'id' => $orderId,
            ]);

            $this->db->commit();
        } catch (Throwable $e) {
            if ($this->db->inTransaction()) {
                $this->db->rollBack();
            }
            error_log('Failed to rollback unpaid Cashfree order #' . $orderId . ': ' . $e->getMessage());
        }
    }

    /**
     * Guest checkout — creates a lightweight customer account (or reuses email)
     * and places the order from submitted cart items + address payload.
     */
    public function guest(array $params = []): void
    {
        $input = $this->getJsonInput();

        $validator = Validator::make($input)
            ->required('email')->email('email')
            ->required('name')
            ->required('phone')
            ->required('shipping_address')
            ->required('items');

        if ($validator->fails()) {
            Response::jsonError('Validation failed.', 422, $validator->errors());
        }

        if (!is_array($input['items']) || count($input['items']) === 0) {
            Response::jsonError('Cart items are required.', 422);
        }

        $email = strtolower(trim($input['email']));
        $userModel = new User($this->db);
        $user = $userModel->findByEmail($email);

        if (!$user) {
            $tempPassword = bin2hex(random_bytes(8));
            $userId = $userModel->create([
                'name' => $input['name'],
                'email' => $email,
                'password' => Security::hashPassword($tempPassword),
                'phone' => $input['phone'],
                'role' => 'customer',
                'status' => 'active',
            ]);
        } else {
            $userId = (int) $user['id'];
        }

        $shippingAddress = $input['shipping_address'];
        if (!is_array($shippingAddress)) {
            Response::jsonError('Invalid shipping address.', 422);
        }

        SchemaGuard::ensureProductGstApplicable($this->db);

        $subtotal = 0;
        $lineItems = [];

        foreach ($input['items'] as $raw) {
            $productId = (int) ($raw['product_id'] ?? 0);
            $variantId = !empty($raw['variant_id']) ? (int) $raw['variant_id'] : null;
            $qty = max(1, (int) ($raw['quantity'] ?? 1));

            if ($variantId) {
                $stmt = $this->db->prepare(
                    'SELECT pv.price, pv.sale_price, pv.stock, p.id as product_id, p.gst_applicable,
                            p.custom_shipping, p.shipping_price, p.sale_price AS product_sale_price
                     FROM product_variants pv JOIN products p ON p.id = pv.product_id
                     WHERE pv.id = :id AND p.id = :product_id AND p.status = :status LIMIT 1'
                );
                $stmt->execute(['id' => $variantId, 'product_id' => $productId, 'status' => 'active']);
                $row = $stmt->fetch();
            } else {
                $stmt = $this->db->prepare(
                    'SELECT id as product_id, price, sale_price, stock, gst_applicable, custom_shipping, shipping_price
                     FROM products WHERE id = :id AND status = :status LIMIT 1'
                );
                $stmt->execute(['id' => $productId, 'status' => 'active']);
                $row = $stmt->fetch();
            }

            if (!$row || (int) $row['stock'] < $qty) {
                Response::jsonError('One or more items are unavailable.', 422);
            }

            $priceRow = [
                'price' => $row['price'],
                'sale_price' => $row['sale_price'] ?? $row['product_sale_price'] ?? null,
                'variant_id' => $variantId,
                'variant_price' => $variantId ? $row['price'] : null,
                'variant_sale_price' => $variantId ? ($row['sale_price'] ?? null) : null,
            ];
            if ($variantId) {
                // variant row: pv.sale_price is sale_price; product sale is product_sale_price
                $priceRow['sale_price'] = $row['product_sale_price'] ?? null;
                $priceRow['variant_sale_price'] = $row['sale_price'] ?? null;
                $priceRow['variant_price'] = $row['price'];
            }
            $price = Pricing::unitPriceFromItem($priceRow);
            $subtotal += $price * $qty;
            $lineItems[] = [
                'product_id' => $productId,
                'variant_id' => $variantId,
                'quantity' => $qty,
                'price' => $price,
                'gst_applicable' => (int) ($row['gst_applicable'] ?? 1),
                'custom_shipping' => (int) ($row['custom_shipping'] ?? 0),
                'shipping_price' => isset($row['shipping_price']) ? (float) $row['shipping_price'] : null,
                'color' => $this->nullableTrim($raw['color'] ?? null, 100),
                'size' => $this->nullableTrim($raw['size'] ?? null, 20),
            ];
        }

        $discount = 0;
        $couponId = null;
        if (!empty($input['coupon_code'])) {
            $couponModel = new Coupon($this->db);
            $coupon = $couponModel->findByCode((string) $input['coupon_code']);
            if ($coupon && !$couponModel->isExpired($coupon)) {
                if ($coupon['max_uses'] === null || (int) $coupon['used_count'] < (int) $coupon['max_uses']) {
                    if ((float) ($coupon['min_order_amount'] ?? 0) <= $subtotal) {
                        $discount = $couponModel->calculateDiscount($coupon, $subtotal);
                        if ($discount > 0) {
                            $couponId = (int) $coupon['id'];
                        }
                    }
                }
            }
        }

        $shipping = Pricing::shippingFromItems($lineItems, (float) $subtotal, 999.0, 49.0);
        $tax = Pricing::gstTaxFromItems($lineItems, (float) $discount);
        $total = round($subtotal - $discount + $shipping + $tax, 2);
        $paymentMethod = in_array($input['payment_method'] ?? '', ['phonepe', 'stripe', 'cod', 'upi', 'cashfree', 'paytm', 'razorpay', 'payu'], true)
            ? $input['payment_method']
            : 'cashfree';

        try {
            $this->db->beginTransaction();

            $orderModel = new Order($this->db);
            $orderNumber = $orderModel->generateOrderNumber();

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
                'payment_status' => 'pending',
                'payment_method' => $paymentMethod,
                'shipping_address' => json_encode($shippingAddress),
                'billing_address' => json_encode($input['billing_address'] ?? $shippingAddress),
                'notes' => $input['notes'] ?? 'Guest checkout',
            ]);

            $orderId = (int) $this->db->lastInsertId();
            $itemStmt = $this->db->prepare(
                'INSERT INTO order_items (order_id, product_id, variant_id, quantity, price, total, color, size, created_at)
                 VALUES (:order_id, :product_id, :variant_id, :quantity, :price, :total, :color, :size, NOW())'
            );

            SchemaGuard::ensureCartOrderItemOptions($this->db);

            foreach ($lineItems as $item) {
                $itemStmt->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'variant_id' => $item['variant_id'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'total' => $item['price'] * $item['quantity'],
                    'color' => $this->nullableTrim($item['color'] ?? null, 100),
                    'size' => $this->nullableTrim($item['size'] ?? null, 20),
                ]);

                if (!empty($item['variant_id'])) {
                    $this->db->prepare(
                        'UPDATE product_variants SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['variant_id'],
                    ]);
                } else {
                    $this->db->prepare(
                        'UPDATE products SET stock = stock - :qty WHERE id = :id AND stock >= :min_qty'
                    )->execute([
                        'qty' => (int) $item['quantity'],
                        'min_qty' => (int) $item['quantity'],
                        'id' => (int) $item['product_id'],
                    ]);
                }
            }

            if ($couponId) {
                (new Coupon($this->db))->incrementUsage($couponId);
            }

            $this->db->commit();

            Response::jsonSuccess([
                'order_id' => $orderId,
                'order_number' => $orderNumber,
                'total' => $total,
                'payment_method' => $paymentMethod,
            ], 'Guest order placed successfully.', 201);
        } catch (Throwable $e) {
            $this->db->rollBack();
            error_log('Guest checkout failed: ' . $e->getMessage());
            Response::jsonError('Failed to place guest order.', 500);
        }
    }

    private function nullableTrim(mixed $value, int $maxLen): ?string
    {
        if ($value === null) {
            return null;
        }
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            return null;
        }
        return mb_substr($trimmed, 0, $maxLen);
    }
}

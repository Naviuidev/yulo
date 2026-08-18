<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class PaymentController extends BaseController
{
    public function initiatePhonePe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (PaymentGatewaySettings::getPublished($this->db) !== 'phonepe') {
            Response::jsonError('PhonePe is not the published payment gateway. Publish it under Admin → Payments.', 422);
        }

        if (empty($input['order_id'])) {
            Response::jsonError('Order ID is required.', 422);
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById((int) $input['order_id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            Response::jsonError('Order is already paid.', 422);
        }

        $client = new PhonePeClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('PhonePe is not configured. Add Client ID and Client Secret under Admin → Payments.', 422);
        }

        $merchantOrderId = preg_replace('/[^A-Za-z0-9_-]/', '', 'YULO' . $order['id'] . 'T' . time());
        $amount = (int) round((float) $order['total'] * 100);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        $redirectUrl = $frontendUrl . '/payment/phonepe/return?order_id=' . rawurlencode($merchantOrderId);

        $result = $client->createPayment([
            'merchantOrderId' => $merchantOrderId,
            'amount' => $amount,
            'redirectUrl' => $redirectUrl,
            'message' => 'YULO order #' . ($order['order_number'] ?? $order['id']),
        ]);

        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'PhonePe payment could not be started.', 502, $result['data']);
        }

        $redirectPayUrl = (string) ($result['data']['redirectUrl'] ?? '');
        if ($redirectPayUrl === '') {
            Response::jsonError('PhonePe did not return a payment URL.', 502, $result['data']);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
             VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $order['id'],
            'gateway' => 'phonepe',
            'transaction_id' => $merchantOrderId,
            'amount' => $order['total'],
            'status' => 'initiated',
            'metadata' => json_encode([
                'phonepe_response' => $result['data'],
                'env' => $client->getEnv(),
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        Response::jsonSuccess([
            'payment_id' => (int) $this->db->lastInsertId(),
            'merchant_order_id' => $merchantOrderId,
            'redirect_url' => $redirectPayUrl,
            'env' => $client->getEnv(),
        ], 'Payment initiated.');
    }

    /** Verify PhonePe Standard Checkout order after redirect. */
    public function verifyPhonePe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $merchantOrderId = trim((string) ($input['order_id'] ?? ''));
        if ($merchantOrderId === '') {
            Response::jsonError('order_id is required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status, o.id AS oid
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $merchantOrderId, 'gateway' => 'phonepe']);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::jsonError('Payment record not found.', 404);
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            Response::jsonSuccess([
                'order_id' => (int) $payment['oid'],
                'payment_status' => 'paid',
                'state' => 'COMPLETED',
            ], 'Already paid.');
        }

        $client = new PhonePeClient($this->db);
        $result = $client->getOrderStatus($merchantOrderId);
        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'Could not verify PhonePe payment.', 502, $result['data']);
        }

        $state = strtoupper((string) ($result['data']['state'] ?? $result['data']['paymentState'] ?? ''));
        $isPaid = in_array($state, ['COMPLETED', 'SUCCESS', 'PAID'], true);

        if ($isPaid) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['oid'],
            ]);

            $this->db->prepare(
                'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'completed',
                'gt' => (string) ($result['data']['orderId'] ?? $result['data']['transactionId'] ?? ''),
                'metadata' => json_encode($result['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => (int) $payment['id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['oid']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (phonepe verify): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['oid'],
            'payment_status' => $isPaid ? 'paid' : 'pending',
            'state' => $state,
        ], $isPaid ? 'Payment verified.' : 'Payment not completed yet.');
    }

    /** Public: which gateway is live on the storefront. */
    public function activeGateway(array $params = []): void
    {
        $published = PaymentGatewaySettings::getPublished($this->db);
        $payload = [
            'gateway' => $published !== '' ? $published : null,
            'label' => $published !== '' ? PaymentGatewaySettings::label($published) : null,
            'env' => null,
        ];

        if ($published === 'phonepe') {
            $payload['env'] = (new PhonePeClient($this->db))->getEnv();
            $payload['configured'] = (new PhonePeClient($this->db))->isConfigured();
        } elseif ($published === 'cashfree') {
            $payload['env'] = (new CashfreeClient($this->db))->getEnv();
            $payload['configured'] = (new CashfreeClient($this->db))->isConfigured();
        } elseif ($published === 'paytm') {
            $client = new PaytmClient($this->db);
            $payload['env'] = $client->getEnv();
            $payload['configured'] = $client->isConfigured();
            $payload['mid'] = $client->getMid();
        } elseif ($published === 'razorpay') {
            $client = new RazorpayClient($this->db);
            $payload['env'] = $client->getEnv();
            $payload['configured'] = $client->isConfigured();
            $payload['key_id'] = $client->getKeyId();
        } elseif ($published === 'payu') {
            $client = new PayUClient($this->db);
            $payload['env'] = $client->getEnv();
            $payload['configured'] = $client->isConfigured();
        } else {
            $payload['configured'] = false;
        }

        Response::jsonSuccess($payload);
    }

    public function phonePeCallback(array $params = []): void
    {
        $input = $this->getJsonInput();
        $response = $input['response'] ?? ($_POST['response'] ?? null);

        if (!$response) {
            Response::jsonError('Invalid callback payload.', 400);
        }

        $decoded = json_decode(base64_decode($response), true);

        if (!is_array($decoded)) {
            Response::jsonError('Invalid response format.', 400);
        }

        $merchantTransactionId = $decoded['data']['merchantTransactionId'] ?? null;
        $transactionId = $decoded['data']['transactionId'] ?? null;
        $state = $decoded['code'] ?? $decoded['data']['state'] ?? 'FAILED';

        $stmt = $this->db->prepare('SELECT * FROM payments WHERE transaction_id = :transaction_id LIMIT 1');
        $stmt->execute(['transaction_id' => $merchantTransactionId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::jsonError('Payment record not found.', 404);
        }

        $isSuccess = in_array($state, ['PAYMENT_SUCCESS', 'SUCCESS'], true);
        $paymentStatus = $isSuccess ? 'completed' : 'failed';

        $updatePay = $this->db->prepare(
            'UPDATE payments SET status = :status, gateway_transaction_id = :gateway_txn, metadata = :metadata, updated_at = NOW() WHERE id = :id'
        );
        $updatePay->execute([
            'status' => $paymentStatus,
            'gateway_txn' => $transactionId,
            'metadata' => json_encode($decoded),
            'id' => $payment['id'],
        ]);

        if ($isSuccess) {
            $updateOrder = $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            );
            $updateOrder->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => $payment['order_id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['order_id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (phonepe): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => $payment['order_id'],
            'payment_status' => $paymentStatus,
        ], 'Callback processed.');
    }

    /** Start Cashfree hosted checkout for an existing YULO order (retry / order detail Pay Now). */
    public function initiateCashfree(array $params = []): void
    {
        if (PaymentGatewaySettings::getPublished($this->db) !== 'cashfree') {
            Response::jsonError('Easy Cash is not the published payment gateway. Publish it under Admin → Payments.', 422);
        }

        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (empty($input['order_id'])) {
            Response::jsonError('Order ID is required.', 422);
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById((int) $input['order_id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            Response::jsonError('Order is already paid.', 422);
        }

        if (($order['status'] ?? '') === 'cancelled') {
            Response::jsonError('Cancelled orders cannot be paid.', 422);
        }

        $client = new CashfreeClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Cashfree is not configured. Add App ID and Secret Key under Admin → Payments.', 422);
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'http://localhost:5173';
        }

        $cfOrderId = (string) $order['order_number'];

        $payStmt = $this->db->prepare(
            'SELECT * FROM payments WHERE order_id = :order_id AND gateway = :gateway ORDER BY id DESC LIMIT 1'
        );
        $payStmt->execute(['order_id' => $order['id'], 'gateway' => 'cashfree']);
        $existingPay = $payStmt->fetch();
        if ($existingPay) {
            $meta = json_decode((string) ($existingPay['metadata'] ?? '{}'), true);
            $existingSession = is_array($meta) ? (string) ($meta['payment_session_id'] ?? '') : '';
            if ($existingSession !== '' && ($existingPay['status'] ?? '') === 'initiated') {
                Response::jsonSuccess([
                    'payment_id' => (int) $existingPay['id'],
                    'order_id' => (int) $order['id'],
                    'order_number' => $cfOrderId,
                    'payment_session_id' => $existingSession,
                    'env' => $client->getEnv(),
                    'return_url' => $frontendUrl . '/payment/cashfree/return?order_id=' . rawurlencode($cfOrderId),
                ], 'Cashfree payment session reused.');
            }
        }

        $existingCf = $client->getOrder($cfOrderId);
        if ($existingCf['ok']) {
            $sessionId = (string) ($existingCf['data']['payment_session_id'] ?? '');
            $cfStatus = strtoupper((string) ($existingCf['data']['order_status'] ?? ''));
            if ($sessionId !== '' && !in_array($cfStatus, ['PAID', 'EXPIRED'], true)) {
                if (!$existingPay) {
                    $this->db->prepare(
                        'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                         VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
                    )->execute([
                        'order_id' => $order['id'],
                        'gateway' => 'cashfree',
                        'transaction_id' => $cfOrderId,
                        'amount' => $order['total'],
                        'status' => 'initiated',
                        'metadata' => json_encode([
                            'payment_session_id' => $sessionId,
                            'cashfree_response' => $existingCf['data'],
                            'env' => $client->getEnv(),
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                    ]);
                    $existingPay = ['id' => (int) $this->db->lastInsertId()];
                }

                Response::jsonSuccess([
                    'payment_id' => (int) $existingPay['id'],
                    'order_id' => (int) $order['id'],
                    'order_number' => $cfOrderId,
                    'payment_session_id' => $sessionId,
                    'env' => $client->getEnv(),
                    'return_url' => $frontendUrl . '/payment/cashfree/return?order_id=' . rawurlencode($cfOrderId),
                ], 'Cashfree payment session loaded.');
            }
        }

        $shipping = json_decode((string) ($order['shipping_address'] ?? '{}'), true);
        if (!is_array($shipping)) {
            $shipping = [];
        }

        $phone = preg_replace('/\D+/', '', (string) ($shipping['phone'] ?? ''));
        $phone = substr((string) $phone, -10);
        if (strlen($phone) !== 10) {
            Response::jsonError('A valid 10-digit phone number is required on the delivery address for payment.', 422);
        }

        $customerName = (string) ($shipping['name'] ?? $shipping['full_name'] ?? $order['customer_name'] ?? 'Customer');
        $customerEmail = (string) ($order['customer_email'] ?? '');
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
            'order_id' => $cfOrderId,
            'order_amount' => round((float) $order['total'], 2),
            'order_currency' => 'INR',
            'customer_details' => [
                'customer_id' => 'user_' . $userId,
                'customer_name' => $customerName,
                'customer_email' => $customerEmail,
                'customer_phone' => $phone,
            ],
            'order_meta' => $orderMeta,
            'order_note' => 'YULO order #' . $order['id'],
        ];

        $result = $client->createOrder($payload);
        if (!$result['ok']) {
            $again = $client->getOrder($cfOrderId);
            $sessionId = (string) ($again['data']['payment_session_id'] ?? '');
            if ($again['ok'] && $sessionId !== '') {
                $result = $again;
            } else {
                error_log('Cashfree create order failed: ' . $result['message'] . ' ' . json_encode($result['data']));
                Response::jsonError($result['message'] ?: 'Unable to start Cashfree payment.', 422, $result['data']);
            }
        }

        $sessionId = (string) ($result['data']['payment_session_id'] ?? '');
        if ($sessionId === '') {
            Response::jsonError('Cashfree did not return a payment session.', 502, $result['data']);
        }

        if ($existingPay) {
            $this->db->prepare(
                'UPDATE payments SET status = :status, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'initiated',
                'metadata' => json_encode([
                    'payment_session_id' => $sessionId,
                    'cashfree_response' => $result['data'],
                    'env' => $client->getEnv(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => $existingPay['id'],
            ]);
            $paymentId = (int) $existingPay['id'];
        } else {
            $stmt = $this->db->prepare(
                'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
                 VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
            );
            $stmt->execute([
                'order_id' => $order['id'],
                'gateway' => 'cashfree',
                'transaction_id' => $cfOrderId,
                'amount' => $order['total'],
                'status' => 'initiated',
                'metadata' => json_encode([
                    'payment_session_id' => $sessionId,
                    'cashfree_response' => $result['data'],
                    'env' => $client->getEnv(),
                ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            ]);
            $paymentId = (int) $this->db->lastInsertId();
        }

        $this->db->prepare(
            'UPDATE orders SET payment_method = :method, payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
        )->execute([
            'method' => 'cashfree',
            'payment_status' => 'pending',
            'id' => $order['id'],
        ]);

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'order_id' => (int) $order['id'],
            'order_number' => $cfOrderId,
            'payment_session_id' => $sessionId,
            'env' => $client->getEnv(),
            'return_url' => $frontendUrl . '/payment/cashfree/return?order_id=' . rawurlencode($cfOrderId),
        ], 'Cashfree payment initiated.');
    }

    /** Verify Cashfree payment after return_url redirect (and update order). */
    public function verifyCashfree(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $cfOrderId = trim((string) ($input['order_id'] ?? $input['order_number'] ?? ''));
        if ($cfOrderId === '') {
            Response::jsonError('Order ID is required.', 422);
        }

        $stmt = $this->db->prepare('SELECT * FROM orders WHERE order_number = :order_number AND user_id = :user_id LIMIT 1');
        $stmt->execute(['order_number' => $cfOrderId, 'user_id' => $userId]);
        $order = $stmt->fetch();

        if (!$order) {
            // Also allow lookup by numeric id for convenience.
            if (ctype_digit($cfOrderId)) {
                $orderModel = new Order($this->db);
                $order = $orderModel->findById((int) $cfOrderId, $userId);
            }
        }

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $order['id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (already paid): ' . $e->getMessage());
            }

            Response::jsonSuccess([
                'order_id' => (int) $order['id'],
                'order_number' => $order['order_number'],
                'payment_status' => 'paid',
                'order_status' => $order['status'],
            ], 'Payment already confirmed.');
        }

        $client = new CashfreeClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Cashfree is not configured.', 422);
        }

        $result = $client->getOrder((string) $order['order_number']);
        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'Unable to verify payment with Cashfree.', 422, $result['data']);
        }

        $cfStatus = strtoupper((string) ($result['data']['order_status'] ?? ''));
        $isPaid = in_array($cfStatus, ['PAID', 'SUCCESS'], true);

        $payStmt = $this->db->prepare(
            'SELECT * FROM payments WHERE order_id = :order_id AND gateway = :gateway ORDER BY id DESC LIMIT 1'
        );
        $payStmt->execute(['order_id' => $order['id'], 'gateway' => 'cashfree']);
        $payment = $payStmt->fetch();

        if ($payment) {
            $meta = json_decode((string) ($payment['metadata'] ?? '{}'), true);
            if (!is_array($meta)) {
                $meta = [];
            }
            $meta['verify_response'] = $result['data'];

            $this->db->prepare(
                'UPDATE payments SET status = :status, gateway_transaction_id = :gateway_txn, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => $isPaid ? 'completed' : (in_array($cfStatus, ['ACTIVE', 'PENDING'], true) ? 'initiated' : 'failed'),
                'gateway_txn' => (string) ($result['data']['cf_order_id'] ?? $result['data']['order_id'] ?? ''),
                'metadata' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => $payment['id'],
            ]);
        }

        if ($isPaid) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => $order['id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $order['id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed: ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $order['id'],
            'order_number' => $order['order_number'],
            'payment_status' => $isPaid ? 'paid' : 'pending',
            'cashfree_status' => $cfStatus,
            'order_status' => $isPaid ? 'confirmed' : $order['status'],
        ], $isPaid ? 'Payment confirmed.' : 'Payment not completed yet.');
    }

    /** Start Paytm JS Checkout for an existing YULO order (retry / Pay Now). */
    public function initiatePaytm(array $params = []): void
    {
        if (PaymentGatewaySettings::getPublished($this->db) !== 'paytm') {
            Response::jsonError('Paytm is not the published payment gateway. Publish it under Admin → Payments.', 422);
        }

        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (empty($input['order_id'])) {
            Response::jsonError('Order ID is required.', 422);
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById((int) $input['order_id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            Response::jsonError('Order is already paid.', 422);
        }

        $client = new PaytmClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Paytm is not configured. Add Merchant ID and Merchant Key under Admin → Payments.', 422);
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontendUrl = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontendUrl === '') {
            $frontendUrl = 'http://localhost:5173';
        }

        $paytmOrderId = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($order['order_number'] ?? ''));
        if ($paytmOrderId === '') {
            $paytmOrderId = 'YULO' . $order['id'] . 'T' . time();
        }

        $address = $order['shipping_address'] ?? null;
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            $address = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($address)) {
            $address = [];
        }
        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);

        $userStmt = $this->db->prepare('SELECT email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $email = (string) ($userStmt->fetchColumn() ?: '');

        $callbackUrl = $frontendUrl . '/payment/paytm/return?order_id=' . rawurlencode($paytmOrderId);
        $total = (float) $order['total'];

        $result = $client->initiateTransaction([
            'orderId' => $paytmOrderId,
            'amount' => $total,
            'customerId' => 'user_' . $userId,
            'callbackUrl' => $callbackUrl,
            'mobile' => $phone,
            'email' => $email,
        ]);

        if (!$result['ok'] || empty($result['txn_token'])) {
            Response::jsonError($result['message'] ?: 'Paytm payment could not be started.', 502, $result['data']);
        }

        $txnToken = (string) $result['txn_token'];

        $stmt = $this->db->prepare(
            'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
             VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $order['id'],
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

        $this->db->prepare(
            'UPDATE orders SET payment_method = :method, payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
        )->execute([
            'method' => 'paytm',
            'payment_status' => 'pending',
            'id' => $order['id'],
        ]);

        Response::jsonSuccess([
            'payment_id' => (int) $this->db->lastInsertId(),
            'order_id' => (int) $order['id'],
            'order_number' => $order['order_number'],
            'paytm_order_id' => $paytmOrderId,
            'txn_token' => $txnToken,
            'amount' => number_format($total, 2, '.', ''),
            'mid' => $client->getMid(),
            'env' => $client->getEnv(),
            'checkout_js_url' => $client->checkoutJsUrl(),
            'return_url' => $callbackUrl,
        ], 'Paytm payment initiated.');
    }

    /** Verify Paytm payment after return / callback. */
    public function verifyPaytm(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        $paytmOrderId = trim((string) ($input['order_id'] ?? $input['order_number'] ?? ''));
        if ($paytmOrderId === '') {
            Response::jsonError('order_id is required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status, o.id AS oid, o.order_number, o.user_id, o.status AS order_status
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway AND o.user_id = :user_id
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $paytmOrderId, 'gateway' => 'paytm', 'user_id' => $userId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            // Fallback: order_number match
            $orderStmt = $this->db->prepare(
                'SELECT * FROM orders WHERE (order_number = :onum OR id = :oid) AND user_id = :user_id LIMIT 1'
            );
            $orderStmt->execute([
                'onum' => $paytmOrderId,
                'oid' => ctype_digit($paytmOrderId) ? (int) $paytmOrderId : 0,
                'user_id' => $userId,
            ]);
            $order = $orderStmt->fetch();
            if (!$order) {
                Response::jsonError('Payment record not found.', 404);
            }

            $payLookup = $this->db->prepare(
                'SELECT * FROM payments WHERE order_id = :order_id AND gateway = :gateway ORDER BY id DESC LIMIT 1'
            );
            $payLookup->execute(['order_id' => $order['id'], 'gateway' => 'paytm']);
            $row = $payLookup->fetch();
            if (!$row) {
                Response::jsonError('Payment record not found.', 404);
            }
            $payment = array_merge($row, [
                'order_payment_status' => $order['payment_status'],
                'oid' => $order['id'],
                'order_number' => $order['order_number'],
                'order_status' => $order['status'],
            ]);
            $paytmOrderId = (string) $row['transaction_id'];
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            Response::jsonSuccess([
                'order_id' => (int) $payment['oid'],
                'order_number' => $payment['order_number'] ?? null,
                'payment_status' => 'paid',
                'result_status' => 'TXN_SUCCESS',
            ], 'Already paid.');
        }

        $client = new PaytmClient($this->db);
        $result = $client->getTransactionStatus($paytmOrderId);
        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'Could not verify Paytm payment.', 502, $result['data']);
        }

        $body = is_array($result['data']['body'] ?? null) ? $result['data']['body'] : [];
        $resultStatus = strtoupper((string) ($body['resultInfo']['resultStatus'] ?? $body['STATUS'] ?? ''));
        $isPaid = in_array($resultStatus, ['TXN_SUCCESS', 'SUCCESS'], true);

        if ($isPaid) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['oid'],
            ]);

            $this->db->prepare(
                'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'completed',
                'gt' => (string) ($body['txnId'] ?? $body['TXNID'] ?? ''),
                'metadata' => json_encode($result['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => (int) $payment['id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['oid']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (paytm verify): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['oid'],
            'order_number' => $payment['order_number'] ?? null,
            'payment_status' => $isPaid ? 'paid' : 'pending',
            'result_status' => $resultStatus,
        ], $isPaid ? 'Payment verified.' : 'Payment not completed yet.');
    }

    /** Paytm server callback / webhook (public). */
    public function paytmCallback(array $params = []): void
    {
        $input = array_merge($_POST, $this->getJsonInput());
        $orderId = trim((string) ($input['ORDERID'] ?? $input['orderId'] ?? $input['order_id'] ?? ''));
        if ($orderId === '') {
            Response::jsonError('ORDERID is required.', 400);
        }

        $checksum = (string) ($input['CHECKSUMHASH'] ?? $input['checksum'] ?? '');
        $client = new PaytmClient($this->db);

        if ($checksum !== '') {
            $paramsForVerify = $input;
            unset($paramsForVerify['CHECKSUMHASH'], $paramsForVerify['checksum']);
            if (!$client->verifyCallbackChecksum($paramsForVerify, $checksum)) {
                Response::jsonError('Invalid Paytm checksum.', 400);
            }
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $orderId, 'gateway' => 'paytm']);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::jsonError('Payment record not found.', 404);
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            Response::jsonSuccess([
                'order_id' => (int) $payment['order_id'],
                'payment_status' => 'paid',
            ], 'Already paid.');
        }

        $statusResult = $client->getTransactionStatus($orderId);
        $body = is_array($statusResult['data']['body'] ?? null) ? $statusResult['data']['body'] : [];
        $resultStatus = strtoupper((string) ($body['resultInfo']['resultStatus'] ?? $input['STATUS'] ?? ''));
        $isPaid = in_array($resultStatus, ['TXN_SUCCESS', 'SUCCESS'], true);

        $this->db->prepare(
            'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
        )->execute([
            'status' => $isPaid ? 'completed' : (in_array($resultStatus, ['PENDING', 'TXN_PENDING'], true) ? 'initiated' : 'failed'),
            'gt' => (string) ($body['txnId'] ?? $input['TXNID'] ?? ''),
            'metadata' => json_encode([
                'callback' => $input,
                'status_response' => $statusResult['data'] ?? [],
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'id' => (int) $payment['id'],
        ]);

        if ($isPaid) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['order_id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['order_id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (paytm callback): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['order_id'],
            'payment_status' => $isPaid ? 'paid' : 'pending',
            'result_status' => $resultStatus,
        ], 'Callback processed.');
    }

    /** Start Razorpay Checkout for an existing YULO order (retry / Pay Now). */
    public function initiateRazorpay(array $params = []): void
    {
        if (PaymentGatewaySettings::getPublished($this->db) !== 'razorpay') {
            Response::jsonError('Razorpay is not the published payment gateway. Publish it under Admin → Payments.', 422);
        }

        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (empty($input['order_id'])) {
            Response::jsonError('Order ID is required.', 422);
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById((int) $input['order_id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            Response::jsonError('Order is already paid.', 422);
        }

        $client = new RazorpayClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('Razorpay is not configured. Add Key ID and Key Secret under Admin → Payments.', 422);
        }

        $address = $order['shipping_address'] ?? null;
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            $address = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($address)) {
            $address = [];
        }
        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];
        $customerEmail = (string) ($user['email'] ?? '');
        $customerName = (string) ($address['name'] ?? $address['full_name'] ?? $user['name'] ?? 'Customer');

        $total = (float) $order['total'];
        $amountPaise = (int) round($total * 100);
        $receipt = preg_replace('/[^A-Za-z0-9]/', '', (string) ($order['order_number'] ?? ''));
        if ($receipt === '') {
            $receipt = 'YULO' . $order['id'];
        }
        $receipt = substr($receipt, 0, 40);

        $result = $client->createOrder([
            'amount' => $amountPaise,
            'receipt' => $receipt,
            'notes' => [
                'yulo_order_id' => (string) $order['id'],
                'yulo_order_number' => (string) ($order['order_number'] ?? ''),
            ],
        ]);

        if (!$result['ok'] || empty($result['order_id'])) {
            Response::jsonError($result['message'] ?: 'Razorpay payment could not be started.', 502, $result['data']);
        }

        $razorpayOrderId = (string) $result['order_id'];

        $stmt = $this->db->prepare(
            'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
             VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $order['id'],
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

        $this->db->prepare(
            'UPDATE orders SET payment_method = :method, payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
        )->execute([
            'method' => 'razorpay',
            'payment_status' => 'pending',
            'id' => $order['id'],
        ]);

        Response::jsonSuccess([
            'payment_id' => (int) $this->db->lastInsertId(),
            'order_id' => (int) $order['id'],
            'order_number' => $order['order_number'],
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
        ], 'Razorpay payment initiated.');
    }

    /** Verify Razorpay payment signature after checkout success. */
    public function verifyRazorpay(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        $razorpayOrderId = trim((string) ($input['razorpay_order_id'] ?? ''));
        $razorpayPaymentId = trim((string) ($input['razorpay_payment_id'] ?? ''));
        $razorpaySignature = trim((string) ($input['razorpay_signature'] ?? ''));

        if ($razorpayOrderId === '' || $razorpayPaymentId === '' || $razorpaySignature === '') {
            Response::jsonError('razorpay_order_id, razorpay_payment_id and razorpay_signature are required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status, o.id AS oid, o.order_number, o.user_id
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway AND o.user_id = :user_id
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $razorpayOrderId, 'gateway' => 'razorpay', 'user_id' => $userId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::jsonError('Payment record not found.', 404);
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            Response::jsonSuccess([
                'order_id' => (int) $payment['oid'],
                'order_number' => $payment['order_number'] ?? null,
                'payment_status' => 'paid',
            ], 'Already paid.');
        }

        $client = new RazorpayClient($this->db);
        if (!$client->verifyPaymentSignature($razorpayOrderId, $razorpayPaymentId, $razorpaySignature)) {
            Response::jsonError('Invalid Razorpay payment signature.', 400);
        }

        $this->db->prepare(
            'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
        )->execute([
            'payment_status' => 'paid',
            'status' => 'confirmed',
            'id' => (int) $payment['oid'],
        ]);

        $this->db->prepare(
            'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
        )->execute([
            'status' => 'completed',
            'gt' => $razorpayPaymentId,
            'metadata' => json_encode([
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => $razorpayPaymentId,
                'razorpay_signature' => $razorpaySignature,
                'verified' => true,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'id' => (int) $payment['id'],
        ]);

        try {
            (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['oid']);
        } catch (Throwable $e) {
            error_log('Order email notify failed (razorpay verify): ' . $e->getMessage());
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['oid'],
            'order_number' => $payment['order_number'] ?? null,
            'payment_status' => 'paid',
            'razorpay_payment_id' => $razorpayPaymentId,
        ], 'Payment verified.');
    }

    /** Razorpay webhook (public). */
    public function razorpayWebhook(array $params = []): void
    {
        $raw = file_get_contents('php://input') ?: '';
        $signature = (string) ($_SERVER['HTTP_X_RAZORPAY_SIGNATURE'] ?? '');
        $client = new RazorpayClient($this->db);

        if ($client->getWebhookSecret() !== '') {
            if (!$client->verifyWebhookSignature($raw, $signature)) {
                Response::jsonError('Invalid Razorpay webhook signature.', 400);
            }
        }

        $payload = json_decode($raw, true);
        if (!is_array($payload)) {
            Response::jsonError('Invalid webhook payload.', 400);
        }

        $event = (string) ($payload['event'] ?? '');
        $paymentEntity = $payload['payload']['payment']['entity'] ?? null;
        if (!is_array($paymentEntity)) {
            Response::jsonSuccess(null, 'Ignored.');
        }

        $razorpayOrderId = (string) ($paymentEntity['order_id'] ?? '');
        $razorpayPaymentId = (string) ($paymentEntity['id'] ?? '');
        $status = strtolower((string) ($paymentEntity['status'] ?? ''));

        if ($razorpayOrderId === '') {
            Response::jsonSuccess(null, 'No order id.');
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $razorpayOrderId, 'gateway' => 'razorpay']);
        $payment = $stmt->fetch();

        if (!$payment) {
            Response::jsonSuccess(null, 'Payment not found.');
        }

        $isPaid = in_array($event, ['payment.captured', 'order.paid'], true)
            || in_array($status, ['captured', 'authorized'], true);

        if ($isPaid && ($payment['order_payment_status'] ?? '') !== 'paid') {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['order_id'],
            ]);

            $this->db->prepare(
                'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'completed',
                'gt' => $razorpayPaymentId,
                'metadata' => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => (int) $payment['id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['order_id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (razorpay webhook): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['order_id'],
            'payment_status' => $isPaid ? 'paid' : 'pending',
        ], 'Webhook processed.');
    }

    /** Start PayU Hosted Checkout for an existing YULO order (retry / Pay Now). */
    public function initiatePayU(array $params = []): void
    {
        if (PaymentGatewaySettings::getPublished($this->db) !== 'payu') {
            Response::jsonError('PayU is not the published payment gateway. Publish it under Admin → Payments.', 422);
        }

        $input = $this->getJsonInput();
        $userId = $this->authUserId();

        if (empty($input['order_id'])) {
            Response::jsonError('Order ID is required.', 422);
        }

        $orderModel = new Order($this->db);
        $order = $orderModel->findById((int) $input['order_id'], $userId);

        if (!$order) {
            Response::jsonError('Order not found.', 404);
        }

        if ($order['payment_status'] === 'paid') {
            Response::jsonError('Order is already paid.', 422);
        }

        $client = new PayUClient($this->db);
        if (!$client->isConfigured()) {
            Response::jsonError('PayU is not configured. Add Merchant Key and Merchant Salt under Admin → Payments.', 422);
        }

        $txnid = preg_replace('/[^A-Za-z0-9_-]/', '', (string) ($order['order_number'] ?? ''));
        if ($txnid === '') {
            $txnid = 'YULO' . $order['id'] . 'T' . time();
        } else {
            // New attempt needs a unique txnid if a prior attempt exists.
            $txnid = $txnid . 'R' . substr((string) time(), -6);
        }

        $address = $order['shipping_address'] ?? null;
        if (is_string($address)) {
            $decoded = json_decode($address, true);
            $address = is_array($decoded) ? $decoded : [];
        }
        if (!is_array($address)) {
            $address = [];
        }
        $phone = preg_replace('/\D+/', '', (string) ($address['phone'] ?? ''));
        $phone = substr((string) $phone, -10);

        $userStmt = $this->db->prepare('SELECT name, email FROM users WHERE id = :id LIMIT 1');
        $userStmt->execute(['id' => $userId]);
        $user = $userStmt->fetch() ?: [];
        $email = (string) ($user['email'] ?? '');
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $email = 'user' . $userId . '@yulo.local';
        }
        $customerName = trim((string) ($user['name'] ?? $address['full_name'] ?? $address['name'] ?? 'Customer'));
        $firstname = trim((string) explode(' ', preg_replace('/\s+/', ' ', $customerName) ?: 'Customer')[0]);
        if ($firstname === '') {
            $firstname = 'Customer';
        }

        $total = (float) $order['total'];
        $callbackUrl = PayUClient::suggestedCallbackUrl();
        $form = $client->buildCheckoutForm([
            'txnid' => $txnid,
            'amount' => $total,
            'productinfo' => 'Order ' . ($order['order_number'] ?? $order['id']),
            'firstname' => $firstname,
            'email' => $email,
            'phone' => $phone !== '' ? $phone : '9999999999',
            'surl' => $callbackUrl,
            'furl' => $callbackUrl,
            'udf1' => (string) $order['id'],
        ]);

        if (!$form['ok'] || empty($form['params'])) {
            Response::jsonError($form['message'] ?: 'PayU payment could not be started.', 422);
        }

        $stmt = $this->db->prepare(
            'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
             VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $order['id'],
            'gateway' => 'payu',
            'transaction_id' => $txnid,
            'amount' => $total,
            'status' => 'initiated',
            'metadata' => json_encode([
                'env' => $client->getEnv(),
                'surl' => $callbackUrl,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ]);

        $this->db->prepare(
            'UPDATE orders SET payment_method = :method, payment_status = :payment_status, updated_at = NOW() WHERE id = :id'
        )->execute([
            'method' => 'payu',
            'payment_status' => 'pending',
            'id' => $order['id'],
        ]);

        Response::jsonSuccess([
            'payment_id' => (int) $this->db->lastInsertId(),
            'order_id' => (int) $order['id'],
            'order_number' => $order['order_number'],
            'txnid' => $txnid,
            'amount' => number_format($total, 2, '.', ''),
            'env' => $client->getEnv(),
            'action' => $form['action'],
            'params' => $form['params'],
        ], 'PayU payment initiated.');
    }

    /** Verify PayU payment after return / callback. */
    public function verifyPayU(array $params = []): void
    {
        $input = $this->getJsonInput();
        $userId = $this->authUserId();
        $txnid = trim((string) ($input['order_id'] ?? $input['txnid'] ?? $input['order_number'] ?? ''));
        if ($txnid === '') {
            Response::jsonError('order_id (txnid) is required.', 422);
        }

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status, o.id AS oid, o.order_number, o.user_id, o.status AS order_status
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway AND o.user_id = :user_id
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $txnid, 'gateway' => 'payu', 'user_id' => $userId]);
        $payment = $stmt->fetch();

        if (!$payment) {
            $orderStmt = $this->db->prepare(
                'SELECT * FROM orders WHERE (order_number = :onum OR id = :oid) AND user_id = :user_id LIMIT 1'
            );
            $orderStmt->execute([
                'onum' => $txnid,
                'oid' => ctype_digit($txnid) ? (int) $txnid : 0,
                'user_id' => $userId,
            ]);
            $order = $orderStmt->fetch();
            if (!$order) {
                Response::jsonError('Payment record not found.', 404);
            }

            $payLookup = $this->db->prepare(
                'SELECT * FROM payments WHERE order_id = :order_id AND gateway = :gateway ORDER BY id DESC LIMIT 1'
            );
            $payLookup->execute(['order_id' => $order['id'], 'gateway' => 'payu']);
            $row = $payLookup->fetch();
            if (!$row) {
                Response::jsonError('Payment record not found.', 404);
            }
            $payment = array_merge($row, [
                'order_payment_status' => $order['payment_status'],
                'oid' => $order['id'],
                'order_number' => $order['order_number'],
                'order_status' => $order['status'],
            ]);
            $txnid = (string) $row['transaction_id'];
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            Response::jsonSuccess([
                'order_id' => (int) $payment['oid'],
                'order_number' => $payment['order_number'] ?? null,
                'payment_status' => 'paid',
                'result_status' => 'success',
            ], 'Already paid.');
        }

        $client = new PayUClient($this->db);
        $result = $client->verifyPayment($txnid);
        if (!$result['ok']) {
            Response::jsonError($result['message'] ?: 'Could not verify PayU payment.', 502, $result['data']);
        }

        $isPaid = !empty($result['paid']);
        $payuStatus = (string) ($result['payu_status'] ?? '');

        if ($isPaid) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['oid'],
            ]);

            $this->db->prepare(
                'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
            )->execute([
                'status' => 'completed',
                'gt' => (string) ($result['mihpayid'] ?? ''),
                'metadata' => json_encode($result['data'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'id' => (int) $payment['id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['oid']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (payu verify): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess([
            'order_id' => (int) $payment['oid'],
            'order_number' => $payment['order_number'] ?? null,
            'payment_status' => $isPaid ? 'paid' : 'pending',
            'result_status' => $payuStatus,
        ], $isPaid ? 'Payment verified.' : 'Payment not completed yet.');
    }

    /**
     * PayU success/failure return (public). Verifies reverse hash, updates order, redirects to storefront.
     */
    public function payuCallback(array $params = []): void
    {
        $input = array_merge($_GET, $_POST, $this->getJsonInput());
        $txnid = trim((string) ($input['txnid'] ?? ''));
        $status = strtolower(trim((string) ($input['status'] ?? '')));

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontend = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontend === '') {
            $frontend = 'http://localhost:5173';
        }
        $returnBase = $frontend . '/payment/payu/return';

        $redirect = static function (string $orderRef, string $hint = '') use ($returnBase): void {
            $url = $returnBase . '?order_id=' . rawurlencode($orderRef);
            if ($hint !== '') {
                $url .= '&status=' . rawurlencode($hint);
            }
            header('Location: ' . $url, true, 302);
            exit;
        };

        if ($txnid === '') {
            $redirect('', 'missing');
        }

        $client = new PayUClient($this->db);
        $hashOk = !empty($input['hash']) && $client->verifyReverseHash($input);

        $stmt = $this->db->prepare(
            'SELECT p.*, o.payment_status AS order_payment_status
             FROM payments p
             INNER JOIN orders o ON o.id = p.order_id
             WHERE p.transaction_id = :txn AND p.gateway = :gateway
             ORDER BY p.id DESC LIMIT 1'
        );
        $stmt->execute(['txn' => $txnid, 'gateway' => 'payu']);
        $payment = $stmt->fetch();

        if (!$payment) {
            $redirect($txnid, 'not_found');
        }

        if (($payment['order_payment_status'] ?? '') === 'paid') {
            $redirect($txnid, 'paid');
        }

        $isSuccess = $hashOk && in_array($status, ['success', 'captured'], true);

        // Prefer server verify when hash missing/invalid (still mark from API if paid).
        if (!$isSuccess) {
            $verify = $client->verifyPayment($txnid);
            if (!empty($verify['paid'])) {
                $isSuccess = true;
                $status = 'success';
                $input['verify_api'] = $verify['data'];
            }
        }

        $this->db->prepare(
            'UPDATE payments SET status = :status, gateway_transaction_id = :gt, metadata = :metadata, updated_at = NOW() WHERE id = :id'
        )->execute([
            'status' => $isSuccess ? 'completed' : (in_array($status, ['pending', 'initiated'], true) ? 'initiated' : 'failed'),
            'gt' => (string) ($input['mihpayid'] ?? $input['payuMoneyId'] ?? ''),
            'metadata' => json_encode([
                'callback' => $input,
                'hash_ok' => $hashOk,
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            'id' => (int) $payment['id'],
        ]);

        if ($isSuccess) {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => (int) $payment['order_id'],
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $payment['order_id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (payu callback): ' . $e->getMessage());
            }
        }

        $redirect($txnid, $isSuccess ? 'paid' : ($status !== '' ? $status : 'pending'));
    }

    /** Cashfree webhook (public). */
    public function cashfreeWebhook(array $params = []): void
    {
        $input = $this->getJsonInput();
        $cfOrderId = (string) ($input['data']['order']['order_id'] ?? $input['order_id'] ?? '');
        $type = (string) ($input['type'] ?? '');

        if ($cfOrderId === '') {
            Response::jsonSuccess(null, 'Ignored.');
        }

        $stmt = $this->db->prepare('SELECT * FROM orders WHERE order_number = :order_number LIMIT 1');
        $stmt->execute(['order_number' => $cfOrderId]);
        $order = $stmt->fetch();

        if (!$order) {
            Response::jsonSuccess(null, 'Order not found locally.');
        }

        $paidEvent = str_contains(strtolower($type), 'success')
            || strtoupper((string) ($input['data']['payment']['payment_status'] ?? '')) === 'SUCCESS'
            || strtoupper((string) ($input['data']['order']['order_status'] ?? '')) === 'PAID';

        if ($paidEvent && $order['payment_status'] !== 'paid') {
            $this->db->prepare(
                'UPDATE orders SET payment_status = :payment_status, status = :status, updated_at = NOW() WHERE id = :id'
            )->execute([
                'payment_status' => 'paid',
                'status' => 'confirmed',
                'id' => $order['id'],
            ]);

            $this->db->prepare(
                'UPDATE payments SET status = :status, metadata = :metadata, updated_at = NOW()
                 WHERE order_id = :order_id AND gateway = :gateway'
            )->execute([
                'status' => 'completed',
                'metadata' => json_encode($input, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                'order_id' => $order['id'],
                'gateway' => 'cashfree',
            ]);

            try {
                (new OrderMailService($this->db))->notifyPaidOrder((int) $order['id']);
            } catch (Throwable $e) {
                error_log('Order email notify failed (webhook): ' . $e->getMessage());
            }
        }

        Response::jsonSuccess(null, 'Webhook processed.');
    }
}

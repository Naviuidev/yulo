<?php

declare(strict_types=1);

require_once __DIR__ . '/BaseController.php';

final class PaymentController extends BaseController
{
    private array $phonepeConfig;

    public function __construct()
    {
        parent::__construct();
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $this->phonepeConfig = $appConfig['phonepe'];
    }

    public function initiatePhonePe(array $params = []): void
    {
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

        $merchantTransactionId = 'YULO' . $order['id'] . time();
        $amount = (int) round((float) $order['total'] * 100);

        $payload = [
            'merchantId' => $this->phonepeConfig['merchant_id'],
            'merchantTransactionId' => $merchantTransactionId,
            'merchantUserId' => 'USER_' . $userId,
            'amount' => $amount,
            'redirectUrl' => $this->phonepeConfig['callback_url'],
            'redirectMode' => 'POST',
            'callbackUrl' => $this->phonepeConfig['callback_url'],
            'paymentInstrument' => ['type' => 'PAY_PAGE'],
        ];

        $base64Payload = base64_encode(json_encode($payload));
        $checksum = $this->generateChecksum($base64Payload, '/pg/v1/pay');

        $apiUrl = $this->phonepeConfig['env'] === 'production'
            ? 'https://api.phonepe.com/apis/hermes/pg/v1/pay'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay';

        $stmt = $this->db->prepare(
            'INSERT INTO payments (order_id, gateway, transaction_id, amount, status, metadata, created_at, updated_at)
             VALUES (:order_id, :gateway, :transaction_id, :amount, :status, :metadata, NOW(), NOW())'
        );
        $stmt->execute([
            'order_id' => $order['id'],
            'gateway' => 'phonepe',
            'transaction_id' => $merchantTransactionId,
            'amount' => $order['total'],
            'status' => 'initiated',
            'metadata' => json_encode(['payload' => $payload]),
        ]);

        $paymentId = (int) $this->db->lastInsertId();

        $response = $this->callPhonePeApi($apiUrl, $base64Payload, $checksum);

        Response::jsonSuccess([
            'payment_id' => $paymentId,
            'merchant_transaction_id' => $merchantTransactionId,
            'redirect_url' => $response['data']['instrumentResponse']['redirectInfo']['url'] ?? null,
            'phonepe_response' => $response,
        ], 'Payment initiated.');
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

    private function generateChecksum(string $base64Payload, string $endpoint): string
    {
        $string = $base64Payload . $endpoint . $this->phonepeConfig['salt_key'];
        return hash('sha256', $string) . '###' . $this->phonepeConfig['salt_index'];
    }

    private function callPhonePeApi(string $url, string $base64Payload, string $checksum): array
    {
        if (empty($this->phonepeConfig['merchant_id']) || empty($this->phonepeConfig['salt_key'])) {
            return [
                'success' => true,
                'code' => 'PAYMENT_INITIATED',
                'message' => 'Sandbox mode - configure PHONEPE credentials for live API',
                'data' => [
                    'instrumentResponse' => [
                        'redirectInfo' => [
                            'url' => (require dirname(__DIR__) . '/config/app.php')['frontend_url'] . '/payment/success',
                        ],
                    ],
                ],
            ];
        }

        $body = json_encode(['request' => $base64Payload]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-VERIFY: ' . $checksum,
            ],
            CURLOPT_POSTFIELDS => $body,
        ]);

        $result = curl_exec($ch);
        curl_close($ch);

        return json_decode($result ?: '{}', true) ?: [];
    }
}

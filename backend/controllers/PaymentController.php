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
        }

        Response::jsonSuccess([
            'order_id' => $payment['order_id'],
            'payment_status' => $paymentStatus,
        ], 'Callback processed.');
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

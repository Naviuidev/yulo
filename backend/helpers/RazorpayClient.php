<?php

declare(strict_types=1);

/**
 * Razorpay Orders + Checkout (Key ID + Key Secret).
 * Credentials: Admin → Payments (settings DB), with .env fallback.
 */
final class RazorpayClient
{
    private string $keyId;
    private string $keySecret;
    private string $env;
    private string $webhookSecret;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'razorpay_key_id',
            'razorpay_key_secret',
            'razorpay_env',
            'razorpay_webhook_secret',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $envFallback = $appConfig['razorpay'] ?? [];

        $this->keyId = trim((string) ($rows['razorpay_key_id'] ?? $envFallback['key_id'] ?? ''));
        $rawSecret = trim((string) ($rows['razorpay_key_secret'] ?? $envFallback['key_secret'] ?? ''));
        $this->keySecret = html_entity_decode($rawSecret, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $this->webhookSecret = trim((string) ($rows['razorpay_webhook_secret'] ?? $envFallback['webhook_secret'] ?? ''));

        $env = trim((string) ($rows['razorpay_env'] ?? $envFallback['env'] ?? ''));
        if ($env === '' || !in_array($env, ['sandbox', 'production'], true)) {
            $env = str_starts_with($this->keyId, 'rzp_live_') ? 'production' : 'sandbox';
        }
        $this->env = $env;
    }

    public function isConfigured(): bool
    {
        return $this->keyId !== '' && $this->keySecret !== '';
    }

    public function getEnv(): string
    {
        return $this->env;
    }

    public function getKeyId(): string
    {
        return $this->keyId;
    }

    public function getWebhookSecret(): string
    {
        return $this->webhookSecret;
    }

    public static function suggestedWebhookUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $apiBase = rtrim((string) ($appConfig['url'] ?? ''), '/');
        if ($apiBase === '') {
            return 'https://your-api-domain.com/api/payments/razorpay/webhook';
        }
        if (str_ends_with($apiBase, '/api')) {
            return $apiBase . '/payments/razorpay/webhook';
        }
        return $apiBase . '/api/payments/razorpay/webhook';
    }

    /**
     * @param array{amount: int, receipt: string, notes?: array<string, string>, currency?: string} $payload
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string, order_id?: string}
     */
    public function createOrder(array $payload): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Razorpay is not configured. Add Key ID and Key Secret under Admin → Payments.',
            ];
        }

        $body = [
            'amount' => (int) $payload['amount'],
            'currency' => (string) ($payload['currency'] ?? 'INR'),
            'receipt' => (string) $payload['receipt'],
            'payment_capture' => 1,
        ];
        if (!empty($payload['notes']) && is_array($payload['notes'])) {
            $body['notes'] = $payload['notes'];
        }

        $result = $this->request('POST', '/orders', $body);
        if (!$result['ok']) {
            return $result;
        }

        $orderId = (string) ($result['data']['id'] ?? '');
        if ($orderId === '') {
            return [
                'ok' => false,
                'status' => 502,
                'data' => $result['data'],
                'message' => 'Razorpay did not return an order id.',
            ];
        }

        $result['order_id'] = $orderId;
        return $result;
    }

    /**
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function fetchPayment(string $paymentId): array
    {
        return $this->request('GET', '/payments/' . rawurlencode($paymentId), null);
    }

    /**
     * Full or partial refund for a captured payment.
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function refundPayment(string $paymentId, int $amountPaise, string $receipt = ''): array
    {
        $paymentId = trim($paymentId);
        if ($paymentId === '') {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Razorpay payment id is required for refund.',
            ];
        }
        if ($amountPaise <= 0) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Refund amount must be greater than zero.',
            ];
        }

        $body = ['amount' => $amountPaise];
        if ($receipt !== '') {
            $body['receipt'] = substr($receipt, 0, 40);
        }

        $result = $this->request('POST', '/payments/' . rawurlencode($paymentId) . '/refund', $body);
        if ($result['ok']) {
            $result['message'] = 'Razorpay refund initiated.';
        }
        return $result;
    }

    public function verifyPaymentSignature(string $orderId, string $paymentId, string $signature): bool
    {
        if ($orderId === '' || $paymentId === '' || $signature === '' || $this->keySecret === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $orderId . '|' . $paymentId, $this->keySecret);
        return hash_equals($expected, $signature);
    }

    public function verifyWebhookSignature(string $payload, string $signature): bool
    {
        if ($this->webhookSecret === '' || $payload === '' || $signature === '') {
            return false;
        }

        $expected = hash_hmac('sha256', $payload, $this->webhookSecret);
        return hash_equals($expected, $signature);
    }

    /**
     * Lightweight credential check: create a ₹1 test order (not charged until checkout).
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function testCredentials(): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Save Key ID and Key Secret first.',
            ];
        }

        $result = $this->createOrder([
            'amount' => 100,
            'receipt' => 'test_' . time(),
            'notes' => ['source' => 'yulo_admin_test'],
        ]);

        if ($result['ok']) {
            return [
                'ok' => true,
                'status' => 200,
                'data' => [
                    'env' => $this->env,
                    'key_id' => $this->keyId,
                    'razorpay_order_id' => $result['order_id'] ?? null,
                ],
                'message' => 'Razorpay credentials work. Test order created successfully ('
                    . ($this->env === 'production' ? 'live' : 'test')
                    . ' mode).',
            ];
        }

        return $result;
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function request(string $method, string $path, ?array $body): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Razorpay is not configured.',
            ];
        }

        $url = 'https://api.razorpay.com/v1' . $path;
        $ch = curl_init($url);
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];

        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_USERPWD => $this->keyId . ':' . $this->keySecret,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 45,
        ];

        $method = strtoupper($method);
        if ($method === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } elseif ($method !== 'GET') {
            $opts[CURLOPT_CUSTOMREQUEST] = $method;
            if ($body !== null) {
                $opts[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            }
        }

        curl_setopt_array($ch, $opts);
        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => $curlError !== '' ? $curlError : 'Razorpay request failed.',
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $message = 'OK';
        if (!empty($decoded['error']['description']) && is_string($decoded['error']['description'])) {
            $message = $decoded['error']['description'];
        } elseif (!empty($decoded['error']['reason']) && is_string($decoded['error']['reason'])) {
            $message = $decoded['error']['reason'];
        } elseif ($status < 200 || $status >= 300) {
            $message = 'Razorpay API error';
        }

        return [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'data' => $decoded,
            'message' => $message,
        ];
    }

    /** @param list<string> $keys @return array<string, string|null> */
    private function loadSettings(array $keys): array
    {
        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare("SELECT `key`, value FROM settings WHERE `key` IN ({$placeholders})");
        $stmt->execute($keys);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['key']] = $row['value'];
        }
        return $out;
    }
}

<?php

declare(strict_types=1);

/**
 * Loads Cashfree credentials (Admin → Payments settings, with .env fallback)
 * and calls Cashfree PG APIs.
 */
final class CashfreeClient
{
    private const API_VERSION = '2023-08-01';

    private string $appId;
    private string $secretKey;
    private string $env;
    private string $webhookUrl;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'cashfree_app_id',
            'cashfree_secret_key',
            'cashfree_env',
            'cashfree_webhook_url',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $envFallback = $appConfig['cashfree'] ?? [];

        $this->appId = trim((string) ($rows['cashfree_app_id'] ?? $envFallback['app_id'] ?? ''));
        $this->secretKey = trim((string) ($rows['cashfree_secret_key'] ?? $envFallback['secret_key'] ?? ''));
        $env = trim((string) ($rows['cashfree_env'] ?? $envFallback['env'] ?? 'sandbox'));
        $this->env = in_array($env, ['sandbox', 'production'], true) ? $env : 'sandbox';
        $this->webhookUrl = trim((string) ($rows['cashfree_webhook_url'] ?? $envFallback['webhook_url'] ?? ''));
    }

    public function isConfigured(): bool
    {
        return $this->appId !== '' && $this->secretKey !== '';
    }

    public function getEnv(): string
    {
        return $this->env;
    }

    public function getAppId(): string
    {
        return $this->appId;
    }

    /**
     * Public HTTPS webhook Cashfree should call (notify_url).
     * Prefer Admin → Payments webhook URL; else derive from APP_URL when not localhost.
     */
    public function getNotifyUrl(): ?string
    {
        $configured = rtrim($this->webhookUrl, '/');
        if ($configured !== '' && $this->isUsableWebhookUrl($configured)) {
            return $configured;
        }

        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $apiBase = rtrim((string) ($appConfig['url'] ?? ''), '/');
        if ($apiBase === '' || !$this->isUsableWebhookUrl($apiBase)) {
            return null;
        }

        // APP_URL may already include /api or not.
        if (str_ends_with($apiBase, '/api')) {
            return $apiBase . '/payments/cashfree/webhook';
        }

        return $apiBase . '/api/payments/cashfree/webhook';
    }

    public function getWebhookUrlConfigured(): string
    {
        return $this->webhookUrl;
    }

    /** Suggested default for admin UI. */
    public static function suggestedWebhookUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $apiBase = rtrim((string) ($appConfig['url'] ?? ''), '/');
        if ($apiBase === '') {
            return 'https://your-api-domain.com/api/payments/cashfree/webhook';
        }
        if (str_ends_with($apiBase, '/api')) {
            return $apiBase . '/payments/cashfree/webhook';
        }
        return $apiBase . '/api/payments/cashfree/webhook';
    }

    private function isUsableWebhookUrl(string $url): bool
    {
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }
        $host = strtolower((string) (parse_url($url, PHP_URL_HOST) ?? ''));
        if ($host === '' || $host === 'localhost' || $host === '127.0.0.1' || str_ends_with($host, '.local')) {
            return false;
        }
        $scheme = strtolower((string) (parse_url($url, PHP_URL_SCHEME) ?? ''));
        // Cashfree expects a reachable public URL; prefer https in production.
        return in_array($scheme, ['https', 'http'], true);
    }

    public function baseUrl(): string
    {
        return $this->env === 'production'
            ? 'https://api.cashfree.com/pg'
            : 'https://sandbox.cashfree.com/pg';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/orders', $payload);
    }

    /**
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function getOrder(string $cashfreeOrderId): array
    {
        return $this->request('GET', '/orders/' . rawurlencode($cashfreeOrderId));
    }

    /**
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function getOrderPayments(string $cashfreeOrderId): array
    {
        return $this->request('GET', '/orders/' . rawurlencode($cashfreeOrderId) . '/payments');
    }

    /**
     * Create a refund against a Cashfree order.
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function createOrderRefund(
        string $cashfreeOrderId,
        float $amount,
        string $refundId,
        string $note = ''
    ): array {
        $cashfreeOrderId = trim($cashfreeOrderId);
        $refundId = trim($refundId);
        if ($cashfreeOrderId === '' || $refundId === '') {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Cashfree order id and refund id are required.',
            ];
        }
        if ($amount <= 0) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Refund amount must be greater than zero.',
            ];
        }

        $body = [
            'refund_amount' => round($amount, 2),
            'refund_id' => substr($refundId, 0, 50),
        ];
        if ($note !== '') {
            $body['refund_note'] = mb_substr($note, 0, 200);
        }

        $result = $this->request(
            'POST',
            '/orders/' . rawurlencode($cashfreeOrderId) . '/refunds',
            $body
        );
        if ($result['ok']) {
            $result['message'] = 'Cashfree refund initiated.';
        }
        return $result;
    }

    /**
     * @param array<string, mixed>|null $body
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function request(string $method, string $path, ?array $body = null): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Cashfree is not configured. Add App ID and Secret Key under Admin → Payments.',
            ];
        }

        $url = rtrim($this->baseUrl(), '/') . $path;
        $ch = curl_init($url);
        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
            'x-api-version: ' . self::API_VERSION,
            'x-client-id: ' . $this->appId,
            'x-client-secret: ' . $this->secretKey,
        ];

        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 30,
        ];

        if (strtoupper($method) === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            $opts[CURLOPT_CUSTOMREQUEST] = strtoupper($method);
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
                'message' => $curlError !== '' ? $curlError : 'Cashfree request failed.',
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $message = 'Cashfree API error';
        if (!empty($decoded['message']) && is_string($decoded['message'])) {
            $message = $decoded['message'];
        } elseif (!empty($decoded['message']) && is_array($decoded['message'])) {
            $message = json_encode($decoded['message']);
        } elseif ($status >= 200 && $status < 300) {
            $message = 'OK';
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

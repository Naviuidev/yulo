<?php

declare(strict_types=1);

/**
 * PhonePe Standard Checkout v2 (OAuth client_id + client_secret — no salt key).
 * Credentials: Admin → Payments (settings DB), with .env fallback.
 */
final class PhonePeClient
{
    private string $clientId;
    private string $clientSecret;
    private string $clientVersion;
    private string $env;
    private ?string $cachedToken = null;
    private int $tokenExpiresAt = 0;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'phonepe_client_id',
            'phonepe_client_secret',
            'phonepe_client_version',
            'phonepe_env',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $envFallback = $appConfig['phonepe'] ?? [];

        $this->clientId = trim((string) ($rows['phonepe_client_id'] ?? $envFallback['client_id'] ?? ''));
        $this->clientSecret = trim((string) ($rows['phonepe_client_secret'] ?? $envFallback['client_secret'] ?? ''));
        $this->clientVersion = trim((string) ($rows['phonepe_client_version'] ?? $envFallback['client_version'] ?? '1'));
        if ($this->clientVersion === '') {
            $this->clientVersion = '1';
        }
        $env = trim((string) ($rows['phonepe_env'] ?? $envFallback['env'] ?? 'sandbox'));
        $this->env = in_array($env, ['sandbox', 'production'], true) ? $env : 'sandbox';
    }

    public function isConfigured(): bool
    {
        return $this->clientId !== '' && $this->clientSecret !== '';
    }

    public function getEnv(): string
    {
        return $this->env;
    }

    public function getClientId(): string
    {
        return $this->clientId;
    }

    public function getClientVersion(): string
    {
        return $this->clientVersion;
    }

    public static function suggestedRedirectUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontend = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontend === '') {
            return 'https://your-store-domain.com/payment/phonepe/return';
        }
        return $frontend . '/payment/phonepe/return';
    }

    /**
     * @param array{merchantOrderId: string, amount: int, redirectUrl: string, message?: string} $payload
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function createPayment(array $payload): array
    {
        $token = $this->getAccessToken();
        if ($token === null) {
            return [
                'ok' => false,
                'status' => 401,
                'data' => [],
                'message' => 'Could not obtain PhonePe access token. Check Client ID / Secret.',
            ];
        }

        $body = [
            'merchantOrderId' => $payload['merchantOrderId'],
            'amount' => (int) $payload['amount'],
            'expireAfter' => 1800,
            'paymentFlow' => [
                'type' => 'PG_CHECKOUT',
                'message' => $payload['message'] ?? 'YULO order payment',
                'merchantUrls' => [
                    'redirectUrl' => $payload['redirectUrl'],
                ],
            ],
        ];

        return $this->requestJson(
            'POST',
            $this->pgBaseUrl() . '/checkout/v2/pay',
            $body,
            ['Authorization: O-Bearer ' . $token]
        );
    }

    /**
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function getOrderStatus(string $merchantOrderId): array
    {
        $token = $this->getAccessToken();
        if ($token === null) {
            return [
                'ok' => false,
                'status' => 401,
                'data' => [],
                'message' => 'Could not obtain PhonePe access token.',
            ];
        }

        $url = $this->pgBaseUrl() . '/checkout/v2/order/' . rawurlencode($merchantOrderId) . '/status';
        return $this->requestJson('GET', $url, null, ['Authorization: O-Bearer ' . $token]);
    }

    /**
     * Refund a PhonePe checkout payment (amount in paise).
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function refundPayment(string $merchantRefundId, string $originalMerchantOrderId, int $amountPaise): array
    {
        $token = $this->getAccessToken();
        if ($token === null) {
            return [
                'ok' => false,
                'status' => 401,
                'data' => [],
                'message' => 'Could not obtain PhonePe access token.',
            ];
        }

        $merchantRefundId = trim($merchantRefundId);
        $originalMerchantOrderId = trim($originalMerchantOrderId);
        if ($merchantRefundId === '' || $originalMerchantOrderId === '' || $amountPaise <= 0) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'PhonePe refund id, original order id and amount are required.',
            ];
        }

        $body = [
            'merchantRefundId' => substr($merchantRefundId, 0, 63),
            'originalMerchantOrderId' => $originalMerchantOrderId,
            'amount' => $amountPaise,
        ];

        $result = $this->requestJson(
            'POST',
            $this->pgBaseUrl() . '/payments/v2/refund',
            $body,
            ['Authorization: O-Bearer ' . $token]
        );

        if ($result['ok']) {
            $result['message'] = 'PhonePe refund initiated.';
        }
        return $result;
    }

    private function authUrl(): string
    {
        return $this->env === 'production'
            ? 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token';
    }

    private function pgBaseUrl(): string
    {
        return $this->env === 'production'
            ? 'https://api.phonepe.com/apis/pg'
            : 'https://api-preprod.phonepe.com/apis/pg-sandbox';
    }

    private function getAccessToken(): ?string
    {
        if (!$this->isConfigured()) {
            return null;
        }

        $now = time();
        if ($this->cachedToken && $this->tokenExpiresAt > ($now + 60)) {
            return $this->cachedToken;
        }

        $ch = curl_init($this->authUrl());
        $form = http_build_query([
            'client_id' => $this->clientId,
            'client_version' => $this->clientVersion,
            'client_secret' => $this->clientSecret,
            'grant_type' => 'client_credentials',
        ]);

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => $form,
            CURLOPT_TIMEOUT => 30,
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $status < 200 || $status >= 300) {
            error_log('PhonePe OAuth failed HTTP ' . $status . ': ' . (string) $raw);
            return null;
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded) || empty($decoded['access_token'])) {
            error_log('PhonePe OAuth missing access_token: ' . (string) $raw);
            return null;
        }

        $this->cachedToken = (string) $decoded['access_token'];
        // expires_at may be epoch seconds
        $expiresAt = (int) ($decoded['expires_at'] ?? 0);
        if ($expiresAt > 1000000000) {
            $this->tokenExpiresAt = $expiresAt;
        } else {
            $this->tokenExpiresAt = $now + max(300, $expiresAt > 0 ? $expiresAt : 3300);
        }

        return $this->cachedToken;
    }

    /**
     * @param array<string, mixed>|null $body
     * @param list<string> $extraHeaders
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function requestJson(string $method, string $url, ?array $body, array $extraHeaders = []): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'PhonePe is not configured. Add Client ID and Client Secret under Admin → Payments.',
            ];
        }

        $ch = curl_init($url);
        $headers = array_merge([
            'Content-Type: application/json',
            'Accept: application/json',
        ], $extraHeaders);

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
                'message' => $curlError !== '' ? $curlError : 'PhonePe request failed.',
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $message = 'PhonePe API error';
        if (!empty($decoded['message']) && is_string($decoded['message'])) {
            $message = $decoded['message'];
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

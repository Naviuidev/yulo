<?php

declare(strict_types=1);

/**
 * Paytm All-in-One / JS Checkout (MID + Merchant Key + checksum).
 * Credentials: Admin → Payments (settings DB), with .env fallback.
 */
final class PaytmClient
{
    private string $mid;
    private string $merchantKey;
    private string $env;
    private string $website;
    private string $webhookUrl;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'paytm_mid',
            'paytm_merchant_key',
            'paytm_env',
            'paytm_website',
            'paytm_webhook_url',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $envFallback = $appConfig['paytm'] ?? [];

        $this->mid = trim((string) ($rows['paytm_mid'] ?? $envFallback['mid'] ?? ''));
        $rawKey = trim((string) ($rows['paytm_merchant_key'] ?? $envFallback['merchant_key'] ?? ''));
        // Keys often contain & # @ — undo accidental HTML encoding from paste/save.
        $this->merchantKey = html_entity_decode($rawKey, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $env = trim((string) ($rows['paytm_env'] ?? $envFallback['env'] ?? 'sandbox'));
        $this->env = in_array($env, ['sandbox', 'production'], true) ? $env : 'sandbox';

        $website = trim((string) ($rows['paytm_website'] ?? $envFallback['website'] ?? ''));
        if ($website === '') {
            $website = $this->env === 'production' ? 'DEFAULT' : 'WEBSTAGING';
        }
        $this->website = $website;
        $this->webhookUrl = trim((string) ($rows['paytm_webhook_url'] ?? $envFallback['webhook_url'] ?? ''));
    }

    public function isConfigured(): bool
    {
        return $this->mid !== '' && $this->merchantKey !== '';
    }

    public function getEnv(): string
    {
        return $this->env;
    }

    public function getMid(): string
    {
        return $this->mid;
    }

    public function getWebsite(): string
    {
        return $this->website;
    }

    public function getWebhookUrlConfigured(): string
    {
        return $this->webhookUrl;
    }

    public function checkoutJsUrl(): string
    {
        return $this->gwBaseUrl() . '/merchantpgpui/checkoutjs/merchants/' . rawurlencode($this->mid) . '.js';
    }

    public static function suggestedCallbackUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontend = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontend === '') {
            return 'https://your-store-domain.com/payment/paytm/return';
        }
        return $frontend . '/payment/paytm/return';
    }

    public static function suggestedWebhookUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $apiBase = rtrim((string) ($appConfig['url'] ?? ''), '/');
        if ($apiBase === '') {
            return 'https://your-api-domain.com/api/payments/paytm/callback';
        }
        if (str_ends_with($apiBase, '/api')) {
            return $apiBase . '/payments/paytm/callback';
        }
        return $apiBase . '/api/payments/paytm/callback';
    }

    /**
     * @param array{
     *   orderId: string,
     *   amount: float|string,
     *   customerId: string,
     *   callbackUrl: string,
     *   mobile?: string,
     *   email?: string
     * } $payload
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string, txn_token?: string}
     */
    public function initiateTransaction(array $payload): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Paytm is not configured. Add Merchant ID and Merchant Key under Admin → Payments.',
            ];
        }

        $orderId = (string) $payload['orderId'];
        $amount = number_format((float) $payload['amount'], 2, '.', '');

        $body = [
            'requestType' => 'Payment',
            'mid' => $this->mid,
            'websiteName' => $this->website,
            'orderId' => $orderId,
            'txnAmount' => [
                'value' => $amount,
                'currency' => 'INR',
            ],
            'userInfo' => [
                'custId' => (string) $payload['customerId'],
            ],
            'callbackUrl' => (string) $payload['callbackUrl'],
        ];

        $mobile = preg_replace('/\D+/', '', (string) ($payload['mobile'] ?? ''));
        $mobile = substr((string) $mobile, -10);
        if (strlen($mobile) === 10) {
            $body['userInfo']['mobile'] = $mobile;
        }
        $email = trim((string) ($payload['email'] ?? ''));
        if ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $body['userInfo']['email'] = $email;
        }

        $bodyJson = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($bodyJson === false) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Failed to encode Paytm request.',
            ];
        }

        try {
            $signature = PaytmChecksum::generateSignature($bodyJson, $this->merchantKey);
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Paytm checksum failed: ' . $e->getMessage(),
            ];
        }

        $url = $this->gwBaseUrl() . '/theia/api/v1/initiateTransaction?mid='
            . rawurlencode($this->mid) . '&orderId=' . rawurlencode($orderId);

        $result = $this->postJson($url, [
            'body' => $body,
            'head' => [
                'channelId' => 'WEB',
                'signature' => $signature,
            ],
        ]);

        if (!$result['ok']) {
            return $this->withFriendlyMessage($result);
        }

        $txnToken = (string) ($result['data']['body']['txnToken'] ?? '');
        $resultStatus = strtoupper((string) ($result['data']['body']['resultInfo']['resultStatus'] ?? ''));
        if ($txnToken === '' || !in_array($resultStatus, ['S', 'SUCCESS'], true)) {
            $info = is_array($result['data']['body']['resultInfo'] ?? null)
                ? $result['data']['body']['resultInfo']
                : [];
            $message = $this->friendlyResultMessage($info);
            return [
                'ok' => false,
                'status' => 422,
                'data' => $result['data'],
                'message' => $message,
            ];
        }

        $result['txn_token'] = $txnToken;
        return $result;
    }

    /**
     * Lightweight credential check (₹1.00 initiate — does not complete a payment).
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
                'message' => 'Save Merchant ID and Merchant Key first.',
            ];
        }

        $orderId = 'TEST' . time();
        $result = $this->initiateTransaction([
            'orderId' => $orderId,
            'amount' => 1.0,
            'customerId' => 'yulo_test',
            'callbackUrl' => self::suggestedCallbackUrl() !== ''
                ? self::suggestedCallbackUrl() . '?order_id=' . rawurlencode($orderId)
                : 'https://merchant.example.com/callback',
            'mobile' => '9999999999',
            'email' => 'test@yulo.local',
        ]);

        if ($result['ok']) {
            return [
                'ok' => true,
                'status' => 200,
                'data' => [
                    'env' => $this->env,
                    'mid' => $this->mid,
                    'website' => $this->website,
                    'order_id' => $orderId,
                ],
                'message' => 'Paytm credentials work. Transaction token received from '
                    . ($this->env === 'production' ? 'production' : 'sandbox')
                    . '.',
            ];
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $info
     */
    private function friendlyResultMessage(array $info): string
    {
        $code = trim((string) ($info['resultCode'] ?? ''));
        $msg = trim((string) ($info['resultMsg'] ?? 'Paytm payment could not be started.'));

        if ($code === '501' || strcasecmp($msg, 'System Error') === 0 || strcasecmp($msg, 'System error') === 0) {
            return 'Paytm rejected these credentials (System Error / 501). '
                . 'Confirm Staging vs Production MID + Merchant Key in Paytm Dashboard → API Keys, '
                . 'match Website Name (usually WEBSTAGING or DEFAULT), and that the MID is active. '
                . 'If keys look correct, ask Paytm support to reset/migrate the staging MID.';
        }

        if ($code === '2005') {
            return 'Paytm checksum is invalid. Re-save the Merchant Key carefully (special characters like & must not be altered).';
        }

        if ($code !== '') {
            return $msg . ' (Paytm code ' . $code . ')';
        }

        return $msg !== '' ? $msg : 'Paytm did not return a transaction token.';
    }

    /**
     * @param array{ok: bool, status: int, data: array<string, mixed>, message: string} $result
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function withFriendlyMessage(array $result): array
    {
        $info = is_array($result['data']['body']['resultInfo'] ?? null)
            ? $result['data']['body']['resultInfo']
            : [];
        if ($info !== []) {
            $result['message'] = $this->friendlyResultMessage($info);
        }
        return $result;
    }

    /**
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function getTransactionStatus(string $orderId): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Paytm is not configured.',
            ];
        }

        $body = [
            'mid' => $this->mid,
            'orderId' => $orderId,
        ];
        $bodyJson = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($bodyJson === false) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Failed to encode Paytm status request.',
            ];
        }

        try {
            $signature = PaytmChecksum::generateSignature($bodyJson, $this->merchantKey);
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Paytm checksum failed: ' . $e->getMessage(),
            ];
        }

        $url = $this->gwBaseUrl() . '/v3/order/status';
        return $this->postJson($url, [
            'body' => $body,
            'head' => [
                'signature' => $signature,
            ],
        ]);
    }

    /**
     * Apply a refund for a successful Paytm transaction.
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function refundTransaction(
        string $orderId,
        string $txnId,
        float $amount,
        string $refId
    ): array {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Paytm is not configured.',
            ];
        }

        $orderId = trim($orderId);
        $txnId = trim($txnId);
        $refId = trim($refId);
        if ($orderId === '' || $txnId === '' || $refId === '') {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Paytm order id, txn id and refund ref are required.',
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
            'mid' => $this->mid,
            'txnType' => 'REFUND',
            'orderId' => $orderId,
            'txnId' => $txnId,
            'refId' => substr($refId, 0, 50),
            'refundAmount' => number_format($amount, 2, '.', ''),
        ];
        $bodyJson = json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($bodyJson === false) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Failed to encode Paytm refund request.',
            ];
        }

        try {
            $signature = PaytmChecksum::generateSignature($bodyJson, $this->merchantKey);
        } catch (Throwable $e) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => 'Paytm checksum failed: ' . $e->getMessage(),
            ];
        }

        $url = $this->gwBaseUrl() . '/refund/apply';
        $result = $this->postJson($url, [
            'body' => $body,
            'head' => [
                'signature' => $signature,
            ],
        ]);

        if (!$result['ok']) {
            return $result;
        }

        $info = $result['data']['body']['resultInfo'] ?? $result['data']['body'] ?? [];
        $code = strtoupper(trim((string) ($info['resultCode'] ?? $info['resultStatus'] ?? '')));
        $msg = trim((string) ($info['resultMsg'] ?? $result['message'] ?? ''));
        $accepted = in_array($code, ['01', '10', 'TXN_SUCCESS', 'PENDING', 'SUCCESS'], true);

        return [
            'ok' => $accepted,
            'status' => $accepted ? 200 : 422,
            'data' => $result['data'],
            'message' => $accepted
                ? ($msg !== '' ? $msg : 'Paytm refund initiated.')
                : ($msg !== '' ? $msg : 'Paytm refund was not accepted.'),
        ];
    }

    public function verifyCallbackChecksum(array $params, string $checksum): bool
    {
        if ($checksum === '' || !$this->isConfigured()) {
            return false;
        }
        try {
            return (bool) PaytmChecksum::verifySignature($params, $this->merchantKey, $checksum);
        } catch (Throwable) {
            return false;
        }
    }

    private function gwBaseUrl(): string
    {
        // New Paytm PG dashboard (paytmpayments.com) hosts — NOT the legacy securegw*.paytm.in
        return $this->env === 'production'
            ? 'https://secure.paytmpayments.com'
            : 'https://securestage.paytmpayments.com';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function postJson(string $url, array $payload): array
    {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Accept: application/json',
            ],
            CURLOPT_POSTFIELDS => json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            CURLOPT_TIMEOUT => 45,
        ]);

        $raw = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($raw === false) {
            return [
                'ok' => false,
                'status' => 500,
                'data' => [],
                'message' => $curlError !== '' ? $curlError : 'Paytm request failed.',
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $message = (string) ($decoded['body']['resultInfo']['resultMsg'] ?? '');
        if ($message === '') {
            $message = $status >= 200 && $status < 300 ? 'OK' : 'Paytm API error';
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

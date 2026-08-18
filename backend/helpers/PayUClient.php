<?php

declare(strict_types=1);

/**
 * PayU Hosted Checkout (Merchant Key + Salt + SHA-512 hash).
 * Credentials: Admin → Payments (settings DB), with .env fallback.
 */
final class PayUClient
{
    private string $merchantKey;
    private string $merchantSalt;
    private string $env;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'payu_merchant_key',
            'payu_merchant_salt',
            'payu_env',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $envFallback = $appConfig['payu'] ?? [];

        $this->merchantKey = html_entity_decode(
            trim((string) ($rows['payu_merchant_key'] ?? $envFallback['merchant_key'] ?? '')),
            ENT_QUOTES | ENT_HTML5,
            'UTF-8'
        );
        $rawSalt = trim((string) ($rows['payu_merchant_salt'] ?? $envFallback['merchant_salt'] ?? ''));
        $this->merchantSalt = html_entity_decode($rawSalt, ENT_QUOTES | ENT_HTML5, 'UTF-8');

        $env = trim((string) ($rows['payu_env'] ?? $envFallback['env'] ?? 'sandbox'));
        $this->env = in_array($env, ['sandbox', 'production'], true) ? $env : 'sandbox';
    }

    public function isConfigured(): bool
    {
        return $this->merchantKey !== '' && $this->merchantSalt !== '';
    }

    public function getEnv(): string
    {
        return $this->env;
    }

    public function getMerchantKey(): string
    {
        return $this->merchantKey;
    }

    public function paymentUrl(): string
    {
        return $this->env === 'production'
            ? 'https://secure.payu.in/_payment'
            : 'https://test.payu.in/_payment';
    }

    public static function suggestedCallbackUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $apiBase = rtrim((string) ($appConfig['url'] ?? ''), '/');
        if ($apiBase === '') {
            return 'https://your-api-domain.com/api/payments/payu/callback';
        }
        if (str_ends_with($apiBase, '/api')) {
            return $apiBase . '/payments/payu/callback';
        }
        return $apiBase . '/api/payments/payu/callback';
    }

    public static function suggestedReturnUrl(): string
    {
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $frontend = rtrim((string) ($appConfig['frontend_url'] ?? ''), '/');
        if ($frontend === '') {
            return 'https://your-store-domain.com/payment/payu/return';
        }
        return $frontend . '/payment/payu/return';
    }

    /**
     * Request hash for hosted checkout.
     * sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
     *
     * @param array{
     *   txnid: string,
     *   amount: string,
     *   productinfo: string,
     *   firstname: string,
     *   email: string,
     *   udf1?: string,
     *   udf2?: string,
     *   udf3?: string,
     *   udf4?: string,
     *   udf5?: string
     * } $fields
     */
    public function buildPaymentHash(array $fields): string
    {
        $parts = [
            $this->merchantKey,
            (string) $fields['txnid'],
            (string) $fields['amount'],
            (string) $fields['productinfo'],
            (string) $fields['firstname'],
            (string) $fields['email'],
            (string) ($fields['udf1'] ?? ''),
            (string) ($fields['udf2'] ?? ''),
            (string) ($fields['udf3'] ?? ''),
            (string) ($fields['udf4'] ?? ''),
            (string) ($fields['udf5'] ?? ''),
            '',
            '',
            '',
            '',
            '',
            $this->merchantSalt,
        ];

        return strtolower(hash('sha512', implode('|', $parts)));
    }

    /**
     * Reverse hash for PayU response (with optional additionalCharges).
     *
     * @param array<string, mixed> $response
     */
    public function verifyReverseHash(array $response): bool
    {
        $received = strtolower(trim((string) ($response['hash'] ?? '')));
        if ($received === '') {
            return false;
        }

        $status = (string) ($response['status'] ?? '');
        $udf5 = (string) ($response['udf5'] ?? '');
        $udf4 = (string) ($response['udf4'] ?? '');
        $udf3 = (string) ($response['udf3'] ?? '');
        $udf2 = (string) ($response['udf2'] ?? '');
        $udf1 = (string) ($response['udf1'] ?? '');
        $email = (string) ($response['email'] ?? '');
        $firstname = (string) ($response['firstname'] ?? '');
        $productinfo = (string) ($response['productinfo'] ?? '');
        $amount = (string) ($response['amount'] ?? '');
        $txnid = (string) ($response['txnid'] ?? '');
        $additionalCharges = trim((string) ($response['additionalCharges'] ?? $response['additional_charges'] ?? ''));

        if ($additionalCharges !== '') {
            $plain = $additionalCharges . '|' . $this->merchantSalt . '|' . $status
                . '||||||' . $udf5 . '|' . $udf4 . '|' . $udf3 . '|' . $udf2 . '|' . $udf1
                . '|' . $email . '|' . $firstname . '|' . $productinfo . '|' . $amount
                . '|' . $txnid . '|' . $this->merchantKey;
        } else {
            $plain = $this->merchantSalt . '|' . $status
                . '||||||' . $udf5 . '|' . $udf4 . '|' . $udf3 . '|' . $udf2 . '|' . $udf1
                . '|' . $email . '|' . $firstname . '|' . $productinfo . '|' . $amount
                . '|' . $txnid . '|' . $this->merchantKey;
        }

        return hash_equals(strtolower(hash('sha512', $plain)), $received);
    }

    /**
     * Build hosted checkout form fields (auto-POST from storefront).
     *
     * @param array{
     *   txnid: string,
     *   amount: float|string,
     *   productinfo: string,
     *   firstname: string,
     *   email: string,
     *   phone: string,
     *   surl: string,
     *   furl: string,
     *   udf1?: string,
     *   udf2?: string,
     *   udf3?: string,
     *   udf4?: string,
     *   udf5?: string
     * } $payload
     * @return array{ok: bool, message: string, action?: string, params?: array<string, string>}
     */
    public function buildCheckoutForm(array $payload): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'message' => 'PayU is not configured. Add Merchant Key and Merchant Salt under Admin → Payments.',
            ];
        }

        $amount = number_format((float) $payload['amount'], 2, '.', '');
        $fields = [
            'txnid' => (string) $payload['txnid'],
            'amount' => $amount,
            'productinfo' => (string) $payload['productinfo'],
            'firstname' => (string) $payload['firstname'],
            'email' => (string) $payload['email'],
            'udf1' => (string) ($payload['udf1'] ?? ''),
            'udf2' => (string) ($payload['udf2'] ?? ''),
            'udf3' => (string) ($payload['udf3'] ?? ''),
            'udf4' => (string) ($payload['udf4'] ?? ''),
            'udf5' => (string) ($payload['udf5'] ?? ''),
        ];

        $hash = $this->buildPaymentHash($fields);

        $params = [
            'key' => $this->merchantKey,
            'txnid' => $fields['txnid'],
            'amount' => $amount,
            'productinfo' => $fields['productinfo'],
            'firstname' => $fields['firstname'],
            'email' => $fields['email'],
            'phone' => (string) $payload['phone'],
            'surl' => (string) $payload['surl'],
            'furl' => (string) $payload['furl'],
            'hash' => $hash,
            'service_provider' => 'payu_paisa',
        ];

        foreach (['udf1', 'udf2', 'udf3', 'udf4', 'udf5'] as $udf) {
            if ($fields[$udf] !== '') {
                $params[$udf] = $fields[$udf];
            }
        }

        return [
            'ok' => true,
            'message' => 'PayU checkout form ready.',
            'action' => $this->paymentUrl(),
            'params' => $params,
        ];
    }

    /**
     * Verify Payment API (server-side status by txnid).
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string, paid?: bool, mihpayid?: string, payu_status?: string}
     */
    public function verifyPayment(string $txnid): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'PayU is not configured.',
            ];
        }

        $txnid = trim($txnid);
        if ($txnid === '') {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'Transaction id is required.',
            ];
        }

        $command = 'verify_payment';
        $hash = strtolower(hash('sha512', $this->merchantKey . '|' . $command . '|' . $txnid . '|' . $this->merchantSalt));

        $result = $this->postService([
            'key' => $this->merchantKey,
            'command' => $command,
            'var1' => $txnid,
            'hash' => $hash,
        ]);

        if (!$result['ok']) {
            return $result;
        }

        $data = $result['data'];
        $details = [];
        if (isset($data['transaction_details']) && is_array($data['transaction_details'])) {
            $details = $data['transaction_details'][$txnid] ?? reset($data['transaction_details']);
            if (!is_array($details)) {
                $details = [];
            }
        }

        $payuStatus = strtolower(trim((string) ($details['status'] ?? $data['status'] ?? '')));
        $isPaid = in_array($payuStatus, ['success', 'captured'], true);

        return [
            'ok' => true,
            'status' => 200,
            'data' => $data,
            'message' => $isPaid ? 'Payment successful.' : 'Payment not completed.',
            'paid' => $isPaid,
            'mihpayid' => (string) ($details['mihpayid'] ?? ''),
            'payu_status' => $payuStatus,
        ];
    }

    /**
     * Refund a captured PayU payment by mihpayid.
     *
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function refundPayment(string $mihpayid, float $amount): array
    {
        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'PayU is not configured.',
            ];
        }

        $mihpayid = trim($mihpayid);
        if ($mihpayid === '') {
            return [
                'ok' => false,
                'status' => 422,
                'data' => [],
                'message' => 'PayU mihpayid is required for refund.',
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

        $command = 'cancel_refund_transaction';
        $hash = strtolower(hash(
            'sha512',
            $this->merchantKey . '|' . $command . '|' . $mihpayid . '|' . $this->merchantSalt
        ));

        $result = $this->postService([
            'key' => $this->merchantKey,
            'command' => $command,
            'var1' => $mihpayid,
            'var2' => number_format($amount, 2, '.', ''),
            'var3' => 'Order cancelled',
            'hash' => $hash,
        ]);

        if (!$result['ok']) {
            return $result;
        }

        $data = is_array($result['data']) ? $result['data'] : [];
        $status = strtolower(trim((string) ($data['status'] ?? $data['transaction_details']['status'] ?? '')));
        $msg = trim((string) ($data['msg'] ?? $data['message'] ?? $result['message'] ?? ''));

        // PayU typically returns status 1 (or "success") when refund is accepted.
        $accepted = $status === '1'
            || $status === 'success'
            || (isset($data['status']) && (string) $data['status'] === '1');

        return [
            'ok' => $accepted,
            'status' => $accepted ? 200 : 422,
            'data' => $data,
            'message' => $accepted
                ? ($msg !== '' ? $msg : 'PayU refund initiated.')
                : ($msg !== '' ? $msg : 'PayU refund was not accepted.'),
        ];
    }

    /**
     * Lightweight credential check via Verify Payment API.
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
                'message' => 'Save Merchant Key and Merchant Salt first.',
            ];
        }

        $command = 'verify_payment';
        $var1 = 'YULO_TEST_' . time();
        $hash = strtolower(hash('sha512', $this->merchantKey . '|' . $command . '|' . $var1 . '|' . $this->merchantSalt));

        $result = $this->postService([
            'key' => $this->merchantKey,
            'command' => $command,
            'var1' => $var1,
            'hash' => $hash,
        ]);

        $raw = is_array($result['data']) ? $result['data'] : [];
        $msg = trim((string) ($raw['msg'] ?? $raw['message'] ?? $result['message'] ?? ''));
        $msgLower = strtolower($msg);
        $envLabel = $this->env === 'production' ? 'production' : 'sandbox';

        // Valid key+salt: PayU accepts the hash even when the txn does not exist.
        $hasTxnBucket = isset($raw['transaction_details']) && is_array($raw['transaction_details']);
        $looksOk = $hasTxnBucket
            || str_contains($msgLower, 'fetched successfully')
            || str_contains($msgLower, 'not found');

        if ($looksOk && !preg_match('/invalid\s*hash/', $msgLower)) {
            return [
                'ok' => true,
                'status' => 200,
                'data' => [
                    'env' => $this->env,
                    'merchant_key' => $this->merchantKey,
                    'payment_url' => $this->paymentUrl(),
                    'payu_msg' => $msg,
                ],
                'message' => 'PayU credentials accepted by the ' . $envLabel . ' Verify Payment API.',
            ];
        }

        if (preg_match('/invalid\s*hash/', $msgLower)) {
            return [
                'ok' => false,
                'status' => 422,
                'data' => $raw,
                'message' => 'PayU rejected these credentials (Invalid Hash). '
                    . 'Use Merchant Key + Merchant Salt from “API Key Salt details” — not Client ID / Client Secret. '
                    . 'Also match Environment to the dashboard (Sandbox vs Production).',
            ];
        }

        if (!$result['ok'] && $result['status'] >= 500) {
            return $result;
        }

        return [
            'ok' => false,
            'status' => 422,
            'data' => $raw,
            'message' => $msg !== ''
                ? ('PayU said: ' . $msg)
                : ('Could not verify PayU credentials against ' . $envLabel . '.'),
        ];
    }

    /**
     * @param array<string, string> $fields
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function postService(array $fields): array
    {
        $url = $this->env === 'production'
            ? 'https://info.payu.in/merchant/postservice.php?form=2'
            : 'https://test.payu.in/merchant/postservice.php?form=2';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($fields),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'Accept: application/json',
            ],
        ]);

        $body = curl_exec($ch);
        $errno = curl_errno($ch);
        $error = curl_error($ch);
        $http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($errno !== 0) {
            return [
                'ok' => false,
                'status' => 502,
                'data' => [],
                'message' => 'PayU API request failed: ' . $error,
            ];
        }

        $decoded = json_decode((string) $body, true);
        if (!is_array($decoded)) {
            parse_str((string) $body, $parsed);
            $decoded = is_array($parsed) ? $parsed : ['raw' => (string) $body];
        }

        if ($http >= 400) {
            return [
                'ok' => false,
                'status' => $http,
                'data' => $decoded,
                'message' => (string) ($decoded['msg'] ?? $decoded['message'] ?? 'PayU API error.'),
            ];
        }

        return [
            'ok' => true,
            'status' => $http > 0 ? $http : 200,
            'data' => $decoded,
            'message' => (string) ($decoded['msg'] ?? 'OK'),
        ];
    }

    /** @param list<string> $keys */
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

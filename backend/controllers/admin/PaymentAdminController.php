<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/BaseController.php';

/**
 * Admin payment gateway credentials + single published gateway for the storefront.
 */
final class PaymentAdminController extends BaseController
{
    private const CASHFREE_KEYS = [
        'cashfree_app_id',
        'cashfree_secret_key',
        'cashfree_env',
        'cashfree_webhook_url',
    ];

    private const PHONEPE_KEYS = [
        'phonepe_client_id',
        'phonepe_client_secret',
        'phonepe_client_version',
        'phonepe_env',
    ];

    private const PAYTM_KEYS = [
        'paytm_mid',
        'paytm_merchant_key',
        'paytm_env',
        'paytm_website',
        'paytm_webhook_url',
    ];

    private const RAZORPAY_KEYS = [
        'razorpay_key_id',
        'razorpay_key_secret',
        'razorpay_env',
        'razorpay_webhook_secret',
    ];

    private const PAYU_KEYS = [
        'payu_merchant_key',
        'payu_merchant_salt',
        'payu_env',
    ];

    public function overview(array $params = []): void
    {
        Response::jsonSuccess($this->buildOverview());
    }

    public function showCashfree(array $params = []): void
    {
        $rows = $this->loadKeys(self::CASHFREE_KEYS);
        $secret = (string) ($rows['cashfree_secret_key'] ?? '');
        $webhook = trim((string) ($rows['cashfree_webhook_url'] ?? ''));
        $published = PaymentGatewaySettings::getPublished($this->db);

        Response::jsonSuccess([
            'app_id' => (string) ($rows['cashfree_app_id'] ?? ''),
            'secret_key' => '',
            'secret_key_set' => $secret !== '',
            'env' => in_array(($rows['cashfree_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
                ? $rows['cashfree_env']
                : 'sandbox',
            'webhook_url' => $webhook,
            'suggested_webhook_url' => CashfreeClient::suggestedWebhookUrl(),
            'configured' => trim((string) ($rows['cashfree_app_id'] ?? '')) !== '' && $secret !== '',
            'published' => $published === 'cashfree',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => trim((string) ($rows['cashfree_app_id'] ?? '')) !== '' && $secret !== '' && $published !== 'cashfree',
        ]);
    }

    public function updateCashfree(array $params = []): void
    {
        $input = $this->getJsonInput();
        $conflict = $this->resolvePublishConflict($input, 'cashfree');
        if ($conflict !== null) {
            Response::jsonError($conflict['message'], 409, [], $conflict);
        }

        $appId = trim((string) ($input['app_id'] ?? ''));
        $secretKey = trim((string) ($input['secret_key'] ?? ''));
        $env = trim((string) ($input['env'] ?? 'sandbox'));
        $webhookUrl = trim((string) ($input['webhook_url'] ?? ''));

        if (!in_array($env, ['sandbox', 'production'], true)) {
            Response::jsonError('Environment must be sandbox or production.', 422);
        }

        if ($webhookUrl !== '') {
            if (!filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
                Response::jsonError('Webhook URL must be a valid URL.', 422);
            }
            $host = strtolower((string) (parse_url($webhookUrl, PHP_URL_HOST) ?? ''));
            if ($host === 'localhost' || $host === '127.0.0.1') {
                Response::jsonError('Webhook URL must be a public domain (not localhost). Use your production API URL.', 422);
            }
            if (!str_contains($webhookUrl, '/payments/cashfree/webhook')) {
                Response::jsonError(
                    'Webhook URL should point to /api/payments/cashfree/webhook on your API domain.',
                    422
                );
            }
        }

        $this->upsertSetting('cashfree_app_id', $appId, 'payment');
        $this->upsertSetting('cashfree_env', $env, 'payment');
        $this->upsertSetting('cashfree_webhook_url', $webhookUrl, 'payment');

        if ($secretKey !== '') {
            $this->upsertSetting('cashfree_secret_key', $secretKey, 'payment');
        }

        $secretSet = $secretKey !== '' || $this->hasSettingSecret('cashfree_secret_key');
        $published = PaymentGatewaySettings::getPublished($this->db);

        Response::jsonSuccess([
            'app_id' => $appId,
            'secret_key' => '',
            'secret_key_set' => $secretSet,
            'env' => $env,
            'webhook_url' => $webhookUrl,
            'suggested_webhook_url' => CashfreeClient::suggestedWebhookUrl(),
            'configured' => $appId !== '' && $secretSet,
            'published' => $published === 'cashfree',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $appId !== '' && $secretSet && $published !== 'cashfree',
        ], 'Easy Cash settings saved.');
    }

    public function showPhonePe(array $params = []): void
    {
        $rows = $this->loadKeys(self::PHONEPE_KEYS);
        $secret = (string) ($rows['phonepe_client_secret'] ?? '');
        $published = PaymentGatewaySettings::getPublished($this->db);
        $clientId = (string) ($rows['phonepe_client_id'] ?? '');
        $version = trim((string) ($rows['phonepe_client_version'] ?? '1'));
        if ($version === '') {
            $version = '1';
        }

        Response::jsonSuccess([
            'client_id' => $clientId,
            'client_secret' => '',
            'client_secret_set' => $secret !== '',
            'client_version' => $version,
            'env' => in_array(($rows['phonepe_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
                ? $rows['phonepe_env']
                : 'sandbox',
            'suggested_redirect_url' => PhonePeClient::suggestedRedirectUrl(),
            'configured' => $clientId !== '' && $secret !== '',
            'published' => $published === 'phonepe',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $clientId !== '' && $secret !== '' && $published !== 'phonepe',
        ]);
    }

    public function updatePhonePe(array $params = []): void
    {
        $input = $this->getJsonInput();
        $conflict = $this->resolvePublishConflict($input, 'phonepe');
        if ($conflict !== null) {
            Response::jsonError($conflict['message'], 409, [], $conflict);
        }

        $clientId = trim((string) ($input['client_id'] ?? ''));
        $clientSecret = trim((string) ($input['client_secret'] ?? ''));
        $clientVersion = trim((string) ($input['client_version'] ?? '1'));
        $env = trim((string) ($input['env'] ?? 'sandbox'));

        if ($clientVersion === '') {
            $clientVersion = '1';
        }

        if (!in_array($env, ['sandbox', 'production'], true)) {
            Response::jsonError('Environment must be sandbox or production.', 422);
        }

        if ($clientId === '') {
            Response::jsonError('Client ID is required.', 422);
        }

        $this->upsertSetting('phonepe_client_id', $clientId, 'payment');
        $this->upsertSetting('phonepe_client_version', $clientVersion, 'payment');
        $this->upsertSetting('phonepe_env', $env, 'payment');

        if ($clientSecret !== '') {
            $this->upsertSetting('phonepe_client_secret', $clientSecret, 'payment');
        }

        $secretSet = $clientSecret !== '' || $this->hasSettingSecret('phonepe_client_secret');
        if (!$secretSet) {
            Response::jsonError('Client Secret is required the first time you save PhonePe settings.', 422);
        }

        $published = PaymentGatewaySettings::getPublished($this->db);

        Response::jsonSuccess([
            'client_id' => $clientId,
            'client_secret' => '',
            'client_secret_set' => $secretSet,
            'client_version' => $clientVersion,
            'env' => $env,
            'suggested_redirect_url' => PhonePeClient::suggestedRedirectUrl(),
            'configured' => true,
            'published' => $published === 'phonepe',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $published !== 'phonepe',
        ], 'PhonePe settings saved.');
    }

    public function showPaytm(array $params = []): void
    {
        $rows = $this->loadKeys(self::PAYTM_KEYS);
        $secret = (string) ($rows['paytm_merchant_key'] ?? '');
        $published = PaymentGatewaySettings::getPublished($this->db);
        $mid = (string) ($rows['paytm_mid'] ?? '');
        $webhook = trim((string) ($rows['paytm_webhook_url'] ?? ''));
        $env = in_array(($rows['paytm_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
            ? $rows['paytm_env']
            : 'sandbox';
        $website = trim((string) ($rows['paytm_website'] ?? ''));
        if ($website === '') {
            $website = $env === 'production' ? 'DEFAULT' : 'WEBSTAGING';
        }

        Response::jsonSuccess([
            'mid' => $mid,
            'merchant_key' => '',
            'merchant_key_set' => $secret !== '',
            'env' => $env,
            'website' => $website,
            'webhook_url' => $webhook,
            'suggested_webhook_url' => PaytmClient::suggestedWebhookUrl(),
            'suggested_callback_url' => PaytmClient::suggestedCallbackUrl(),
            'configured' => $mid !== '' && $secret !== '',
            'published' => $published === 'paytm',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $mid !== '' && $secret !== '' && $published !== 'paytm',
        ]);
    }

    public function updatePaytm(array $params = []): void
    {
        $input = $this->getJsonInput();
        $conflict = $this->resolvePublishConflict($input, 'paytm');
        if ($conflict !== null) {
            Response::jsonError($conflict['message'], 409, [], $conflict);
        }

        $mid = trim((string) ($input['mid'] ?? ''));
        $merchantKey = html_entity_decode(trim((string) ($input['merchant_key'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $env = trim((string) ($input['env'] ?? 'sandbox'));
        $website = trim((string) ($input['website'] ?? ''));
        $webhookUrl = trim((string) ($input['webhook_url'] ?? ''));

        if (!in_array($env, ['sandbox', 'production'], true)) {
            Response::jsonError('Environment must be sandbox or production.', 422);
        }

        if ($mid === '') {
            Response::jsonError('Merchant ID (MID) is required.', 422);
        }

        if ($website === '') {
            $website = $env === 'production' ? 'DEFAULT' : 'WEBSTAGING';
        }

        if ($webhookUrl !== '') {
            if (!filter_var($webhookUrl, FILTER_VALIDATE_URL)) {
                Response::jsonError('Webhook URL must be a valid URL.', 422);
            }
            $host = strtolower((string) (parse_url($webhookUrl, PHP_URL_HOST) ?? ''));
            if ($host === 'localhost' || $host === '127.0.0.1') {
                Response::jsonError('Webhook URL must be a public domain (not localhost). Use your production API URL.', 422);
            }
        }

        $this->upsertSetting('paytm_mid', $mid, 'payment');
        $this->upsertSetting('paytm_env', $env, 'payment');
        $this->upsertSetting('paytm_website', $website, 'payment');
        $this->upsertSetting('paytm_webhook_url', $webhookUrl, 'payment');

        if ($merchantKey !== '') {
            $this->upsertSetting('paytm_merchant_key', $merchantKey, 'payment');
        }

        $secretSet = $merchantKey !== '' || $this->hasSettingSecret('paytm_merchant_key');
        if (!$secretSet) {
            Response::jsonError('Merchant Key is required the first time you save Paytm settings.', 422);
        }

        $published = PaymentGatewaySettings::getPublished($this->db);

        Response::jsonSuccess([
            'mid' => $mid,
            'merchant_key' => '',
            'merchant_key_set' => $secretSet,
            'env' => $env,
            'website' => $website,
            'webhook_url' => $webhookUrl,
            'suggested_webhook_url' => PaytmClient::suggestedWebhookUrl(),
            'suggested_callback_url' => PaytmClient::suggestedCallbackUrl(),
            'configured' => true,
            'published' => $published === 'paytm',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $published !== 'paytm',
        ], 'Paytm settings saved.');
    }

    public function testPaytm(array $params = []): void
    {
        $client = new PaytmClient($this->db);
        $result = $client->testCredentials();
        if (!$result['ok']) {
            Response::jsonError(
                $result['message'] ?: 'Paytm credential test failed.',
                422,
                [],
                is_array($result['data']) ? $result['data'] : []
            );
        }

        Response::jsonSuccess($result['data'], $result['message']);
    }

    public function showRazorpay(array $params = []): void
    {
        $rows = $this->loadKeys(self::RAZORPAY_KEYS);
        $secret = (string) ($rows['razorpay_key_secret'] ?? '');
        $published = PaymentGatewaySettings::getPublished($this->db);
        $keyId = (string) ($rows['razorpay_key_id'] ?? '');
        $webhookSecret = (string) ($rows['razorpay_webhook_secret'] ?? '');
        $env = in_array(($rows['razorpay_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
            ? $rows['razorpay_env']
            : (str_starts_with($keyId, 'rzp_live_') ? 'production' : 'sandbox');

        Response::jsonSuccess([
            'key_id' => $keyId,
            'key_secret' => '',
            'key_secret_set' => $secret !== '',
            'webhook_secret' => '',
            'webhook_secret_set' => $webhookSecret !== '',
            'env' => $env,
            'suggested_webhook_url' => RazorpayClient::suggestedWebhookUrl(),
            'configured' => $keyId !== '' && $secret !== '',
            'published' => $published === 'razorpay',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $keyId !== '' && $secret !== '' && $published !== 'razorpay',
        ]);
    }

    public function updateRazorpay(array $params = []): void
    {
        $input = $this->getJsonInput();
        $conflict = $this->resolvePublishConflict($input, 'razorpay');
        if ($conflict !== null) {
            Response::jsonError($conflict['message'], 409, [], $conflict);
        }

        $keyId = trim((string) ($input['key_id'] ?? ''));
        $keySecret = html_entity_decode(trim((string) ($input['key_secret'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $webhookSecret = trim((string) ($input['webhook_secret'] ?? ''));
        $env = trim((string) ($input['env'] ?? 'sandbox'));

        if ($keyId === '') {
            Response::jsonError('Key ID is required.', 422);
        }

        if (!in_array($env, ['sandbox', 'production'], true)) {
            $env = str_starts_with($keyId, 'rzp_live_') ? 'production' : 'sandbox';
        }

        if (str_starts_with($keyId, 'rzp_live_')) {
            $env = 'production';
        } elseif (str_starts_with($keyId, 'rzp_test_')) {
            $env = 'sandbox';
        }

        $this->upsertSetting('razorpay_key_id', $keyId, 'payment');
        $this->upsertSetting('razorpay_env', $env, 'payment');

        if ($keySecret !== '') {
            $this->upsertSetting('razorpay_key_secret', $keySecret, 'payment');
        }

        if ($webhookSecret !== '') {
            $this->upsertSetting('razorpay_webhook_secret', $webhookSecret, 'payment');
        }

        $secretSet = $keySecret !== '' || $this->hasSettingSecret('razorpay_key_secret');
        if (!$secretSet) {
            Response::jsonError('Key Secret is required the first time you save Razorpay settings.', 422);
        }

        $published = PaymentGatewaySettings::getPublished($this->db);
        $webhookSet = $webhookSecret !== '' || $this->hasSettingSecret('razorpay_webhook_secret');

        Response::jsonSuccess([
            'key_id' => $keyId,
            'key_secret' => '',
            'key_secret_set' => $secretSet,
            'webhook_secret' => '',
            'webhook_secret_set' => $webhookSet,
            'env' => $env,
            'suggested_webhook_url' => RazorpayClient::suggestedWebhookUrl(),
            'configured' => true,
            'published' => $published === 'razorpay',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $published !== 'razorpay',
        ], 'Razorpay settings saved.');
    }

    public function testRazorpay(array $params = []): void
    {
        $client = new RazorpayClient($this->db);
        $result = $client->testCredentials();
        if (!$result['ok']) {
            Response::jsonError(
                $result['message'] ?: 'Razorpay credential test failed.',
                422,
                [],
                is_array($result['data']) ? $result['data'] : []
            );
        }

        Response::jsonSuccess($result['data'], $result['message']);
    }

    public function showPayU(array $params = []): void
    {
        $rows = $this->loadKeys(self::PAYU_KEYS);
        $salt = (string) ($rows['payu_merchant_salt'] ?? '');
        $published = PaymentGatewaySettings::getPublished($this->db);
        $merchantKey = (string) ($rows['payu_merchant_key'] ?? '');
        $env = in_array(($rows['payu_env'] ?? 'sandbox'), ['sandbox', 'production'], true)
            ? $rows['payu_env']
            : 'sandbox';

        Response::jsonSuccess([
            'merchant_key' => $merchantKey,
            'merchant_salt' => '',
            'merchant_salt_set' => $salt !== '',
            'env' => $env,
            'suggested_callback_url' => PayUClient::suggestedCallbackUrl(),
            'suggested_return_url' => PayUClient::suggestedReturnUrl(),
            'configured' => $merchantKey !== '' && $salt !== '',
            'published' => $published === 'payu',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $merchantKey !== '' && $salt !== '' && $published !== 'payu',
        ]);
    }

    public function updatePayU(array $params = []): void
    {
        $input = $this->getJsonInput();
        $conflict = $this->resolvePublishConflict($input, 'payu');
        if ($conflict !== null) {
            Response::jsonError($conflict['message'], 409, [], $conflict);
        }

        $merchantKey = html_entity_decode(trim((string) ($input['merchant_key'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $merchantSalt = html_entity_decode(trim((string) ($input['merchant_salt'] ?? '')), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $env = trim((string) ($input['env'] ?? 'sandbox'));

        if ($merchantKey === '') {
            Response::jsonError('Merchant Key is required.', 422);
        }

        if (!in_array($env, ['sandbox', 'production'], true)) {
            Response::jsonError('Environment must be sandbox or production.', 422);
        }

        $this->upsertSetting('payu_merchant_key', $merchantKey, 'payment');
        $this->upsertSetting('payu_env', $env, 'payment');

        if ($merchantSalt !== '') {
            $this->upsertSetting('payu_merchant_salt', $merchantSalt, 'payment');
        }

        $saltSet = $merchantSalt !== '' || $this->hasSettingSecret('payu_merchant_salt');
        if (!$saltSet) {
            Response::jsonError('Merchant Salt is required the first time you save PayU settings.', 422);
        }

        $published = PaymentGatewaySettings::getPublished($this->db);

        Response::jsonSuccess([
            'merchant_key' => $merchantKey,
            'merchant_salt' => '',
            'merchant_salt_set' => $saltSet,
            'env' => $env,
            'suggested_callback_url' => PayUClient::suggestedCallbackUrl(),
            'suggested_return_url' => PayUClient::suggestedReturnUrl(),
            'configured' => true,
            'published' => $published === 'payu',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'can_publish' => $published !== 'payu',
        ], 'PayU settings saved.');
    }

    public function testPayU(array $params = []): void
    {
        $client = new PayUClient($this->db);
        $result = $client->testCredentials();
        if (!$result['ok']) {
            Response::jsonError(
                $result['message'] ?: 'PayU credential test failed.',
                422,
                [],
                is_array($result['data']) ? $result['data'] : []
            );
        }

        Response::jsonSuccess($result['data'], $result['message']);
    }

    public function publish(array $params = []): void
    {
        $input = $this->getJsonInput();
        $gateway = trim((string) ($input['gateway'] ?? ''));
        if (!in_array($gateway, PaymentGatewaySettings::GATEWAYS, true)) {
            Response::jsonError('Invalid payment gateway.', 422);
        }

        if (!$this->isGatewayConfigured($gateway)) {
            Response::jsonError('Save credentials for this gateway before publishing.', 422);
        }

        $current = PaymentGatewaySettings::getPublished($this->db);
        if ($current !== '' && $current !== $gateway && empty($input['unpublish_current'])) {
            Response::jsonError(
                'Another payment gateway is published. Unpublish it before publishing this one.',
                409,
                [],
                [
                    'code' => 'GATEWAY_PUBLISHED_CONFLICT',
                    'published_gateway' => $current,
                    'published_gateway_label' => PaymentGatewaySettings::label($current),
                    'requested_gateway' => $gateway,
                    'requested_gateway_label' => PaymentGatewaySettings::label($gateway),
                ]
            );
        }

        PaymentGatewaySettings::setPublished($this->db, $gateway);

        Response::jsonSuccess(
            $this->buildOverview(),
            PaymentGatewaySettings::label($gateway) . ' is now published on the website.'
        );
    }

    public function unpublish(array $params = []): void
    {
        PaymentGatewaySettings::unpublish($this->db);
        Response::jsonSuccess($this->buildOverview(), 'Payment gateway unpublished from the website.');
    }

    /**
     * @return array<string, mixed>|null Conflict payload, or null when OK to proceed
     */
    private function resolvePublishConflict(array $input, string $savingGateway): ?array
    {
        $published = PaymentGatewaySettings::getPublished($this->db);
        if ($published === '' || $published === $savingGateway) {
            return null;
        }

        if (!empty($input['unpublish_current'])) {
            PaymentGatewaySettings::unpublish($this->db);
            return null;
        }

        return [
            'code' => 'GATEWAY_PUBLISHED_CONFLICT',
            'message' => 'Unpublish '
                . PaymentGatewaySettings::label($published)
                . ' before configuring '
                . PaymentGatewaySettings::label($savingGateway)
                . '.',
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'requested_gateway' => $savingGateway,
            'requested_gateway_label' => PaymentGatewaySettings::label($savingGateway),
        ];
    }

    private function buildOverview(): array
    {
        $published = PaymentGatewaySettings::getPublished($this->db);
        $cashfree = new CashfreeClient($this->db);
        $phonepe = new PhonePeClient($this->db);
        $paytm = new PaytmClient($this->db);
        $razorpay = new RazorpayClient($this->db);
        $payu = new PayUClient($this->db);

        return [
            'published_gateway' => $published,
            'published_gateway_label' => PaymentGatewaySettings::label($published),
            'gateways' => [
                [
                    'id' => 'razorpay',
                    'label' => 'Razorpay',
                    'configured' => $razorpay->isConfigured(),
                    'published' => $published === 'razorpay',
                    'env' => $razorpay->getEnv(),
                ],
                [
                    'id' => 'phonepe',
                    'label' => 'PhonePe',
                    'configured' => $phonepe->isConfigured(),
                    'published' => $published === 'phonepe',
                    'env' => $phonepe->getEnv(),
                ],
                [
                    'id' => 'paytm',
                    'label' => 'Paytm',
                    'configured' => $paytm->isConfigured(),
                    'published' => $published === 'paytm',
                    'env' => $paytm->getEnv(),
                ],
                [
                    'id' => 'cashfree',
                    'label' => 'Easy Cash (Cashfree)',
                    'configured' => $cashfree->isConfigured(),
                    'published' => $published === 'cashfree',
                    'env' => $cashfree->getEnv(),
                ],
                [
                    'id' => 'payu',
                    'label' => 'PayU',
                    'configured' => $payu->isConfigured(),
                    'published' => $published === 'payu',
                    'env' => $payu->getEnv(),
                ],
            ],
        ];
    }

    private function isGatewayConfigured(string $gateway): bool
    {
        if ($gateway === 'phonepe') {
            return (new PhonePeClient($this->db))->isConfigured();
        }
        if ($gateway === 'cashfree') {
            return (new CashfreeClient($this->db))->isConfigured();
        }
        if ($gateway === 'paytm') {
            return (new PaytmClient($this->db))->isConfigured();
        }
        if ($gateway === 'razorpay') {
            return (new RazorpayClient($this->db))->isConfigured();
        }
        if ($gateway === 'payu') {
            return (new PayUClient($this->db))->isConfigured();
        }
        return false;
    }

    /** @param list<string> $keys */
    private function loadKeys(array $keys): array
    {
        if ($keys === []) {
            return [];
        }

        $placeholders = implode(',', array_fill(0, count($keys), '?'));
        $stmt = $this->db->prepare("SELECT `key`, value FROM settings WHERE `key` IN ({$placeholders})");
        $stmt->execute($keys);
        $out = [];
        foreach ($stmt->fetchAll() as $row) {
            $out[$row['key']] = $row['value'];
        }
        return $out;
    }

    private function upsertSetting(string $key, string $value, string $group): void
    {
        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 0, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 0, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => $key,
            'value' => $value,
            'group' => $group,
            'value_update' => $value,
            'group_update' => $group,
        ]);
    }

    private function hasSettingSecret(string $key): bool
    {
        $stmt = $this->db->prepare('SELECT value FROM settings WHERE `key` = :key LIMIT 1');
        $stmt->execute(['key' => $key]);
        $value = $stmt->fetchColumn();
        return is_string($value) && $value !== '';
    }
}

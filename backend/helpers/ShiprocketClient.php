<?php

declare(strict_types=1);

/**
 * Shiprocket API client — credentials from Admin → Shiprocket (env fallback).
 * Auth: POST /v1/external/auth/login → bearer token.
 */
final class ShiprocketClient
{
    private const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

    private string $email;
    private string $password;
    private string $channelId;
    private string $pickupLocation;
    private bool $enabled;

    public function __construct(private PDO $db)
    {
        $rows = $this->loadSettings([
            'shiprocket_email',
            'shiprocket_password',
            'shiprocket_channel_id',
            'shiprocket_pickup_location',
            'shiprocket_enabled',
        ]);
        $appConfig = require dirname(__DIR__) . '/config/app.php';
        $fallback = $appConfig['shiprocket'] ?? [];

        $this->email = strtolower(trim((string) ($rows['shiprocket_email'] ?? $fallback['email'] ?? '')));
        $this->password = (string) ($rows['shiprocket_password'] ?? $fallback['password'] ?? '');
        $this->channelId = trim((string) ($rows['shiprocket_channel_id'] ?? $fallback['channel_id'] ?? ''));
        $this->pickupLocation = trim((string) ($rows['shiprocket_pickup_location'] ?? $fallback['pickup_location'] ?? ''));
        $enabledRaw = $rows['shiprocket_enabled'] ?? $fallback['enabled'] ?? '0';
        $this->enabled = $enabledRaw === '1' || $enabledRaw === 1 || $enabledRaw === true || $enabledRaw === 'true';
    }

    public function isConfigured(): bool
    {
        return $this->email !== '' && $this->password !== '';
    }

    public function isEnabled(): bool
    {
        return $this->enabled && $this->isConfigured();
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getChannelId(): string
    {
        return $this->channelId;
    }

    public function getPickupLocation(): string
    {
        return $this->pickupLocation !== '' ? $this->pickupLocation : 'Primary';
    }

    /**
     * @return array{ok: bool, token?: string, message: string, data?: array<string, mixed>}
     */
    public function login(bool $force = false): array
    {
        if (!$this->isConfigured()) {
            return ['ok' => false, 'message' => 'Shiprocket is not configured.'];
        }

        if (!$force) {
            $cached = $this->getCachedToken();
            if ($cached !== null) {
                return ['ok' => true, 'token' => $cached, 'message' => 'OK'];
            }
        }

        $result = $this->request('POST', '/auth/login', [
            'email' => $this->email,
            'password' => $this->password,
        ], null);

        if (!$result['ok']) {
            return [
                'ok' => false,
                'message' => $result['message'] ?: 'Shiprocket login failed.',
                'data' => $result['data'],
            ];
        }

        $token = (string) ($result['data']['token'] ?? '');
        if ($token === '') {
            return [
                'ok' => false,
                'message' => 'Shiprocket did not return a token.',
                'data' => $result['data'],
            ];
        }

        $this->cacheToken($token);

        return ['ok' => true, 'token' => $token, 'message' => 'OK'];
    }

    /**
     * Authenticated API call (auto login + one retry on 401).
     *
     * @param array<string, mixed>|null $body
     * @param array<string, scalar>|null $query
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    public function api(string $method, string $path, ?array $body = null, ?array $query = null): array
    {
        $login = $this->login(false);
        if (!$login['ok']) {
            return [
                'ok' => false,
                'status' => 401,
                'data' => $login['data'] ?? [],
                'message' => $login['message'] ?: 'Shiprocket login failed.',
            ];
        }

        $result = $this->request($method, $path, $body, (string) $login['token'], $query);
        if ($result['status'] === 401) {
            $login = $this->login(true);
            if (!$login['ok']) {
                return [
                    'ok' => false,
                    'status' => 401,
                    'data' => $login['data'] ?? [],
                    'message' => $login['message'] ?: 'Shiprocket login failed.',
                ];
            }
            $result = $this->request($method, $path, $body, (string) $login['token'], $query);
        }

        return $result;
    }

    /**
     * Resolve warehouse pin for the configured pickup location nickname.
     *
     * @return array{ok: bool, message: string, pincode?: string, pickup_name?: string}
     */
    public function resolvePickupPincode(): array
    {
        $wanted = strtolower(trim($this->getPickupLocation()));
        $result = $this->api('GET', '/settings/company/pickup');
        if (!$result['ok']) {
            return [
                'ok' => false,
                'message' => $result['message'] ?: 'Could not load Shiprocket pickup locations.',
            ];
        }

        $rows = $result['data']['data']['shipping_address']
            ?? $result['data']['shipping_address']
            ?? $result['data']['data']
            ?? [];
        if (!is_array($rows)) {
            $rows = [];
        }

        $fallbackPin = '';
        $fallbackName = '';
        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }
            $name = trim((string) ($row['pickup_location'] ?? $row['location_name'] ?? $row['nickname'] ?? ''));
            $pin = preg_replace('/\D+/', '', (string) ($row['pin_code'] ?? $row['pincode'] ?? $row['postal_code'] ?? '')) ?: '';
            if ($pin === '') {
                continue;
            }
            if ($fallbackPin === '') {
                $fallbackPin = $pin;
                $fallbackName = $name;
            }
            if ($wanted !== '' && strtolower($name) === $wanted) {
                return [
                    'ok' => true,
                    'message' => 'OK',
                    'pincode' => $pin,
                    'pickup_name' => $name !== '' ? $name : $this->getPickupLocation(),
                ];
            }
        }

        if ($fallbackPin !== '') {
            return [
                'ok' => true,
                'message' => 'OK',
                'pincode' => $fallbackPin,
                'pickup_name' => $fallbackName !== '' ? $fallbackName : $this->getPickupLocation(),
            ];
        }

        return [
            'ok' => false,
            'message' => 'No Shiprocket pickup location with a pincode was found. Add one in Shiprocket, then retry.',
        ];
    }

    /**
     * @return array{ok: bool, message: string, courier_id?: int, courier_name?: string, data?: array<string, mixed>}
     */
    public function getBestCourier(string $pickupPin, string $deliveryPin, float $weightKg, bool $isCod): array
    {
        $result = $this->api('GET', '/courier/serviceability/', null, [
            'pickup_postcode' => preg_replace('/\D+/', '', $pickupPin) ?: $pickupPin,
            'delivery_postcode' => preg_replace('/\D+/', '', $deliveryPin) ?: $deliveryPin,
            'weight' => max(0.1, round($weightKg, 2)),
            'cod' => $isCod ? 1 : 0,
        ]);

        if (!$result['ok']) {
            return [
                'ok' => false,
                'message' => $result['message'] ?: 'Courier serviceability check failed.',
                'data' => $result['data'],
            ];
        }

        $data = $result['data']['data'] ?? $result['data'];
        $available = $data['available_courier_companies'] ?? [];
        if (!is_array($available) || $available === []) {
            return [
                'ok' => false,
                'message' => 'No Shiprocket courier is serviceable for this pincode.',
                'data' => $result['data'],
            ];
        }

        usort($available, static function ($a, $b): int {
            $rateA = (float) ($a['rate'] ?? $a['freight_charge'] ?? PHP_FLOAT_MAX);
            $rateB = (float) ($b['rate'] ?? $b['freight_charge'] ?? PHP_FLOAT_MAX);
            return $rateA <=> $rateB;
        });

        $best = $available[0];
        $courierId = (int) ($best['courier_company_id'] ?? $best['id'] ?? 0);
        if ($courierId <= 0) {
            return [
                'ok' => false,
                'message' => 'Shiprocket serviceability returned no courier id.',
                'data' => $result['data'],
            ];
        }

        return [
            'ok' => true,
            'message' => 'OK',
            'courier_id' => $courierId,
            'courier_name' => (string) ($best['courier_name'] ?? $best['courier_company_name'] ?? ''),
            'data' => $best,
        ];
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{ok: bool, message: string, shiprocket_order_id?: int, shipment_id?: int, data?: array<string, mixed>}
     */
    public function createAdhocOrder(array $payload): array
    {
        $result = $this->api('POST', '/orders/create/adhoc', $payload);
        if (!$result['ok']) {
            $msg = $result['message'];
            if (!empty($result['data']['errors']) && is_array($result['data']['errors'])) {
                $flat = [];
                foreach ($result['data']['errors'] as $key => $val) {
                    if (is_array($val)) {
                        $flat[] = $key . ': ' . implode(', ', $val);
                    } else {
                        $flat[] = is_string($key) ? ($key . ': ' . $val) : (string) $val;
                    }
                }
                if ($flat !== []) {
                    $msg = implode(' | ', $flat);
                }
            }
            return [
                'ok' => false,
                'message' => $msg ?: 'Could not create Shiprocket order.',
                'data' => $result['data'],
            ];
        }

        $srOrderId = (int) ($result['data']['order_id'] ?? 0);
        $shipmentId = (int) ($result['data']['shipment_id'] ?? 0);
        if ($shipmentId <= 0) {
            return [
                'ok' => false,
                'message' => 'Shiprocket did not return a shipment_id.',
                'data' => $result['data'],
            ];
        }

        return [
            'ok' => true,
            'message' => 'Shiprocket order created.',
            'shiprocket_order_id' => $srOrderId,
            'shipment_id' => $shipmentId,
            'data' => $result['data'],
        ];
    }

    /**
     * @return array{ok: bool, message: string, awb?: string, courier_name?: string, data?: array<string, mixed>}
     */
    public function assignAwb(int $shipmentId, ?int $courierId = null): array
    {
        $body = ['shipment_id' => $shipmentId];
        if ($courierId !== null && $courierId > 0) {
            $body['courier_id'] = $courierId;
        }

        $result = $this->api('POST', '/courier/assign/awb', $body);
        if (!$result['ok']) {
            return [
                'ok' => false,
                'message' => $result['message'] ?: 'Could not assign AWB.',
                'data' => $result['data'],
            ];
        }

        $response = $result['data']['response']['data'] ?? $result['data']['response'] ?? $result['data'];
        if (!is_array($response)) {
            $response = $result['data'];
        }

        $awb = (string) ($response['awb_code'] ?? $result['data']['awb_code'] ?? '');
        $courierName = (string) ($response['courier_name'] ?? $result['data']['courier_name'] ?? '');

        if ($awb === '') {
            return [
                'ok' => false,
                'message' => 'Shiprocket did not return an AWB code.',
                'data' => $result['data'],
            ];
        }

        return [
            'ok' => true,
            'message' => 'AWB assigned.',
            'awb' => $awb,
            'courier_name' => $courierName,
            'data' => $result['data'],
        ];
    }

    /**
     * Request pickup for shipment(s) after AWB is assigned.
     *
     * @param list<int> $shipmentIds
     * @return array{ok: bool, message: string, data?: array<string, mixed>}
     */
    public function requestPickup(array $shipmentIds): array
    {
        $ids = array_values(array_filter(array_map('intval', $shipmentIds)));
        if ($ids === []) {
            return ['ok' => false, 'message' => 'No shipment ids for pickup.'];
        }

        $result = $this->api('POST', '/courier/generate/pickup', [
            'shipment_id' => $ids,
        ]);

        if (!$result['ok']) {
            return [
                'ok' => false,
                'message' => $result['message'] ?: 'Pickup request failed.',
                'data' => $result['data'],
            ];
        }

        return [
            'ok' => true,
            'message' => 'Pickup requested.',
            'data' => $result['data'],
        ];
    }

    /**
     * @param array<string, mixed>|null $body
     * @param array<string, scalar>|null $query
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function request(
        string $method,
        string $path,
        ?array $body = null,
        ?string $token = null,
        ?array $query = null
    ): array {
        $url = rtrim(self::BASE_URL, '/') . $path;
        if ($query) {
            $url .= (str_contains($url, '?') ? '&' : '?') . http_build_query($query);
        }

        $headers = [
            'Content-Type: application/json',
            'Accept: application/json',
        ];
        if ($token) {
            $headers[] = 'Authorization: Bearer ' . $token;
        }

        $ch = curl_init($url);
        $opts = [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_TIMEOUT => 45,
        ];

        $method = strtoupper($method);
        if ($method === 'GET') {
            $opts[CURLOPT_HTTPGET] = true;
        } elseif ($method === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
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
                'message' => $curlError !== '' ? $curlError : 'Shiprocket request failed.',
            ];
        }

        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            $decoded = [];
        }

        $message = 'Shiprocket API error';
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

    private function getCachedToken(): ?string
    {
        $stmt = $this->db->prepare(
            "SELECT value FROM settings WHERE `key` = 'shiprocket_token_cache' LIMIT 1"
        );
        $stmt->execute();
        $raw = $stmt->fetchColumn();
        if (!is_string($raw) || $raw === '') {
            return null;
        }

        $data = json_decode($raw, true);
        if (!is_array($data)) {
            return null;
        }

        $token = (string) ($data['token'] ?? '');
        $expiresAt = (int) ($data['expires_at'] ?? 0);
        if ($token === '' || $expiresAt < time()) {
            return null;
        }

        return $token;
    }

    private function cacheToken(string $token): void
    {
        // Shiprocket tokens typically last ~10 days; refresh earlier.
        $payload = json_encode([
            'token' => $token,
            'expires_at' => time() + (9 * 24 * 60 * 60),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $stmt = $this->db->prepare(
            'INSERT INTO settings (`key`, value, `group`, is_public, updated_at)
             VALUES (:key, :value, :group, 0, NOW())
             ON DUPLICATE KEY UPDATE value = :value_update, `group` = :group_update, is_public = 0, updated_at = NOW()'
        );
        $stmt->execute([
            'key' => 'shiprocket_token_cache',
            'value' => $payload,
            'group' => 'shipping',
            'value_update' => $payload,
            'group_update' => 'shipping',
        ]);
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

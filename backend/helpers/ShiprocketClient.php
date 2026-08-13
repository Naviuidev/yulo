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
        return $this->pickupLocation;
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
     * @param array<string, mixed>|null $body
     * @return array{ok: bool, status: int, data: array<string, mixed>, message: string}
     */
    private function request(string $method, string $path, ?array $body = null, ?string $token = null): array
    {
        $url = rtrim(self::BASE_URL, '/') . $path;
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
            CURLOPT_TIMEOUT => 30,
        ];

        if (strtoupper($method) === 'POST') {
            $opts[CURLOPT_POST] = true;
            $opts[CURLOPT_POSTFIELDS] = json_encode($body ?? new stdClass(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        } else {
            $opts[CURLOPT_CUSTOMREQUEST] = strtoupper($method);
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

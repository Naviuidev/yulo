<?php

declare(strict_types=1);

final class JWT
{
    public static function encode(array $payload, ?string $secret = null, ?int $expiry = null): string
    {
        $config = require dirname(__DIR__) . '/config/app.php';
        $secret = $secret ?? $config['jwt']['secret'];
        $expiry = $expiry ?? $config['jwt']['expiry'];

        $header = ['typ' => 'JWT', 'alg' => 'HS256'];

        $now = time();
        $payload = array_merge([
            'iat' => $now,
            'exp' => $now + $expiry,
            'iss' => $config['jwt']['issuer'],
        ], $payload);

        $segments = [
            self::base64UrlEncode(json_encode($header, JSON_UNESCAPED_UNICODE)),
            self::base64UrlEncode(json_encode($payload, JSON_UNESCAPED_UNICODE)),
        ];

        $signingInput = implode('.', $segments);
        $signature = hash_hmac('sha256', $signingInput, $secret, true);
        $segments[] = self::base64UrlEncode($signature);

        return implode('.', $segments);
    }

    public static function decode(string $token, ?string $secret = null): ?array
    {
        $config = require dirname(__DIR__) . '/config/app.php';
        $secret = $secret ?? $config['jwt']['secret'];

        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }

        [$headerB64, $payloadB64, $signatureB64] = $parts;

        $header = json_decode(self::base64UrlDecode($headerB64), true);
        if (!is_array($header) || ($header['alg'] ?? '') !== 'HS256') {
            return null;
        }

        $signingInput = $headerB64 . '.' . $payloadB64;
        $expectedSignature = self::base64UrlEncode(hash_hmac('sha256', $signingInput, $secret, true));

        if (!hash_equals($expectedSignature, $signatureB64)) {
            return null;
        }

        $payload = json_decode(self::base64UrlDecode($payloadB64), true);
        if (!is_array($payload)) {
            return null;
        }

        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            return null;
        }

        return $payload;
    }

    public static function encodeRefresh(array $payload): string
    {
        $config = require dirname(__DIR__) . '/config/app.php';
        return self::encode($payload, $config['jwt']['secret'], $config['jwt']['refresh_expiry']);
    }

    public static function extractBearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';

        if (preg_match('/Bearer\s+(\S+)/i', $header, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }

        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }
}

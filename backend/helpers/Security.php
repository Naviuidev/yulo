<?php

declare(strict_types=1);

final class Security
{
    public static function sanitizeString(?string $value): string
    {
        if ($value === null) {
            return '';
        }

        return htmlspecialchars(trim($value), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public static function sanitizeArray(array $data): array
    {
        $sanitized = [];

        foreach ($data as $key => $value) {
            if (is_array($value)) {
                $sanitized[$key] = self::sanitizeArray($value);
            } elseif (is_string($value)) {
                $sanitized[$key] = self::sanitizeString($value);
            } else {
                $sanitized[$key] = $value;
            }
        }

        return $sanitized;
    }

    public static function escapeXss(?string $value): string
    {
        return self::sanitizeString($value);
    }

    public static function generateCsrfToken(): string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();

        return $token;
    }

    public static function validateCsrfToken(?string $token): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (empty($token) || empty($_SESSION['csrf_token'])) {
            return false;
        }

        $valid = hash_equals($_SESSION['csrf_token'], $token);

        // Token expires after 2 hours
        if ($valid && isset($_SESSION['csrf_token_time']) && (time() - $_SESSION['csrf_token_time']) > 7200) {
            return false;
        }

        return $valid;
    }

    public static function checkRateLimit(string $key, ?int $max = null, ?int $window = null): bool
    {
        $config = require dirname(__DIR__) . '/config/app.php';
        $max = $max ?? $config['rate_limit']['max'];
        $window = $window ?? $config['rate_limit']['window'];

        $storageDir = sys_get_temp_dir() . '/yulo_rate_limit';
        if (!is_dir($storageDir)) {
            mkdir($storageDir, 0755, true);
        }

        $file = $storageDir . '/' . hash('sha256', $key) . '.json';
        $now = time();
        $data = ['count' => 0, 'reset_at' => $now + $window];

        if (file_exists($file)) {
            $stored = json_decode((string) file_get_contents($file), true);
            if (is_array($stored)) {
                $data = $stored;
            }
        }

        if ($now >= ($data['reset_at'] ?? 0)) {
            $data = ['count' => 0, 'reset_at' => $now + $window];
        }

        $data['count'] = ($data['count'] ?? 0) + 1;
        file_put_contents($file, json_encode($data), LOCK_EX);

        return $data['count'] <= $max;
    }

    public static function getClientIp(): string
    {
        $headers = ['HTTP_X_FORWARDED_FOR', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];

        foreach ($headers as $header) {
            if (!empty($_SERVER[$header])) {
                $ips = explode(',', (string) $_SERVER[$header]);
                return trim($ips[0]);
            }
        }

        return '0.0.0.0';
    }

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function generateToken(int $length = 32): string
    {
        return bin2hex(random_bytes($length));
    }
}

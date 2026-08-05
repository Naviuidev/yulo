<?php

declare(strict_types=1);

final class CorsMiddleware
{
    public function handle(): bool
    {
        $config = require dirname(__DIR__) . '/config/cors.php';
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (in_array('*', $config['allowed_origins'], true)) {
            header('Access-Control-Allow-Origin: *');
        } elseif ($origin && in_array($origin, $config['allowed_origins'], true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
        }

        header('Access-Control-Allow-Methods: ' . implode(', ', $config['allowed_methods']));
        header('Access-Control-Allow-Headers: ' . implode(', ', $config['allowed_headers']));
        header('Access-Control-Expose-Headers: ' . implode(', ', $config['exposed_headers']));
        header('Access-Control-Max-Age: ' . $config['max_age']);

        if ($config['allow_credentials']) {
            header('Access-Control-Allow-Credentials: true');
        }

        if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
            http_response_code(204);
            exit;
        }

        return true;
    }
}

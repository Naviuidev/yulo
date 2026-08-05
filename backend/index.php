<?php

declare(strict_types=1);

/**
 * YULO eCommerce - Front Controller
 * Core PHP 8.3 REST API
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

define('BASE_PATH', __DIR__);

// Load environment
(function (): void {
    $envFile = BASE_PATH . '/.env';
    if (!file_exists($envFile)) {
        $envFile = BASE_PATH . '/.env.example';
    }

    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            if (!str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            if (!array_key_exists($key, $_ENV)) {
                $_ENV[$key] = $value;
                putenv("{$key}={$value}");
            }
        }
    }
})();

date_default_timezone_set('Asia/Kolkata');

// Composer autoload (PHPMailer)
if (file_exists(BASE_PATH . '/vendor/autoload.php')) {
    require_once BASE_PATH . '/vendor/autoload.php';
}

// PSR-4 style autoloader
spl_autoload_register(function (string $class): void {
    $paths = [
        BASE_PATH . '/helpers/' . $class . '.php',
        BASE_PATH . '/config/' . $class . '.php',
        BASE_PATH . '/middleware/' . $class . '.php',
        BASE_PATH . '/models/' . $class . '.php',
        BASE_PATH . '/controllers/' . $class . '.php',
        BASE_PATH . '/controllers/admin/' . $class . '.php',
    ];

    foreach ($paths as $path) {
        if (file_exists($path)) {
            require_once $path;
            return;
        }
    }
});

// Global exception handler
set_exception_handler(function (Throwable $e): void {
    $debug = filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN);
    error_log($e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

    Response::jsonError(
        $debug ? $e->getMessage() : 'Internal server error.',
        500,
        $debug ? ['trace' => explode("\n", $e->getTraceAsString())] : []
    );
});

// CORS preflight
$cors = new CorsMiddleware();
$cors->handle();

// Rate limiting
$rateLimit = new RateLimitMiddleware();
$rateLimit->handle();

// Route dispatch
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';

// Normalize known deployment prefixes (XAMPP / built-in server / subdirectory)
$prefixes = [
    '/yulo/backend/api',
    '/yulo/backend',
    '/backend/api',
    '/backend',
    '/api',
];

foreach ($prefixes as $prefix) {
    if ($uri === $prefix || str_starts_with($uri, $prefix . '/')) {
        $uri = substr($uri, strlen($prefix)) ?: '/';
        break;
    }
}

// Also strip script directory when running via api/index.php or router.php
$scriptName = str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? ''));
if ($scriptName !== '/' && $scriptName !== '' && str_starts_with($uri, $scriptName)) {
    $uri = substr($uri, strlen($scriptName)) ?: '/';
}

$uri = '/' . ltrim($uri, '/');
if ($uri !== '/') {
    $uri = rtrim($uri, '/') ?: '/';
}

$router = new Router();
require BASE_PATH . '/routes/api.php';
$router->dispatch($method, $uri);

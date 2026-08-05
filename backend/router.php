<?php

/**
 * PHP built-in server router
 * Usage: php -S 127.0.0.1:8080 router.php
 */

$uri = urldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');

// Serve real static assets only (uploads, etc.) — never short-circuit API routes
$staticFile = __DIR__ . $uri;
if (
    $uri !== '/'
    && !str_starts_with($uri, '/api')
    && is_file($staticFile)
) {
    return false;
}

require __DIR__ . '/index.php';

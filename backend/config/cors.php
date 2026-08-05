<?php

declare(strict_types=1);

$origins = array_filter(array_map('trim', explode(',', $_ENV['CORS_ALLOWED_ORIGINS'] ?? '*')));

return [
    'allowed_origins' => $origins ?: ['*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'X-CSRF-Token',
    ],
    'exposed_headers' => ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    'max_age' => 86400,
    'allow_credentials' => true,
];

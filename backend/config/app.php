<?php

declare(strict_types=1);

return [
    'name' => $_ENV['APP_NAME'] ?? 'YULO',
    'env' => $_ENV['APP_ENV'] ?? 'local',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'url' => rtrim($_ENV['APP_URL'] ?? 'http://localhost/yulo/backend', '/'),
    'frontend_url' => rtrim($_ENV['FRONTEND_URL'] ?? 'http://localhost:3000', '/'),
    'admin_url' => rtrim($_ENV['ADMIN_URL'] ?? 'http://localhost:5174', '/'),
    'staff_licence_dev_email' => $_ENV['STAFF_LICENCE_DEV_EMAIL'] ?? 'naveenreddy.webdev@gmail.com',
    'timezone' => 'Asia/Kolkata',
    'jwt' => [
        'secret' => $_ENV['JWT_SECRET'] ?? 'yulo-default-secret-change-in-production',
        'expiry' => (int) ($_ENV['JWT_EXPIRY'] ?? 3600),
        'refresh_expiry' => (int) ($_ENV['JWT_REFRESH_EXPIRY'] ?? 604800),
        'algorithm' => 'HS256',
        'issuer' => $_ENV['APP_NAME'] ?? 'YULO',
    ],
    'upload' => [
        'path' => dirname(__DIR__) . '/' . ltrim($_ENV['UPLOAD_PATH'] ?? 'uploads', '/'),
        'max_size' => (int) ($_ENV['MAX_UPLOAD_SIZE'] ?? 5242880),
        'allowed_mimes' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'],
        'allowed_extensions' => ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'],
    ],
    'mail' => [
        'host' => $_ENV['MAIL_HOST'] ?? 'smtp.gmail.com',
        'port' => (int) ($_ENV['MAIL_PORT'] ?? 587),
        'username' => $_ENV['MAIL_USERNAME'] ?? '',
        'password' => $_ENV['MAIL_PASSWORD'] ?? '',
        'from_address' => $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@yulo.com',
        'from_name' => $_ENV['MAIL_FROM_NAME'] ?? 'YULO',
    ],
    'phonepe' => [
        'client_id' => $_ENV['PHONEPE_CLIENT_ID'] ?? '',
        'client_secret' => $_ENV['PHONEPE_CLIENT_SECRET'] ?? '',
        'client_version' => $_ENV['PHONEPE_CLIENT_VERSION'] ?? '1',
        'env' => $_ENV['PHONEPE_ENV'] ?? 'sandbox',
        // Legacy (v1 salt) — unused by Standard Checkout v2
        'merchant_id' => $_ENV['PHONEPE_MERCHANT_ID'] ?? '',
        'salt_key' => $_ENV['PHONEPE_SALT_KEY'] ?? '',
        'salt_index' => (int) ($_ENV['PHONEPE_SALT_INDEX'] ?? 1),
        'callback_url' => $_ENV['PHONEPE_CALLBACK_URL'] ?? '',
    ],
    'cashfree' => [
        'app_id' => $_ENV['CASHFREE_APP_ID'] ?? '',
        'secret_key' => $_ENV['CASHFREE_SECRET_KEY'] ?? '',
        'env' => $_ENV['CASHFREE_ENV'] ?? 'sandbox',
        'webhook_url' => $_ENV['CASHFREE_WEBHOOK_URL'] ?? '',
    ],
    'paytm' => [
        'mid' => $_ENV['PAYTM_MID'] ?? '',
        'merchant_key' => $_ENV['PAYTM_MERCHANT_KEY'] ?? '',
        'env' => $_ENV['PAYTM_ENV'] ?? 'sandbox',
        'website' => $_ENV['PAYTM_WEBSITE'] ?? '',
        'webhook_url' => $_ENV['PAYTM_WEBHOOK_URL'] ?? '',
    ],
    'razorpay' => [
        'key_id' => $_ENV['RAZORPAY_KEY_ID'] ?? '',
        'key_secret' => $_ENV['RAZORPAY_KEY_SECRET'] ?? '',
        'env' => $_ENV['RAZORPAY_ENV'] ?? 'sandbox',
        'webhook_secret' => $_ENV['RAZORPAY_WEBHOOK_SECRET'] ?? '',
    ],
    'payu' => [
        'merchant_key' => $_ENV['PAYU_MERCHANT_KEY'] ?? '',
        'merchant_salt' => $_ENV['PAYU_MERCHANT_SALT'] ?? '',
        'env' => $_ENV['PAYU_ENV'] ?? 'sandbox',
    ],
    'shiprocket' => [
        'email' => $_ENV['SHIPROCKET_EMAIL'] ?? '',
        'password' => $_ENV['SHIPROCKET_PASSWORD'] ?? '',
        'channel_id' => $_ENV['SHIPROCKET_CHANNEL_ID'] ?? '',
        'pickup_location' => $_ENV['SHIPROCKET_PICKUP_LOCATION'] ?? '',
        'enabled' => filter_var($_ENV['SHIPROCKET_ENABLED'] ?? false, FILTER_VALIDATE_BOOLEAN),
    ],
    'rate_limit' => [
        'max' => (int) ($_ENV['RATE_LIMIT_MAX'] ?? 100),
        'window' => (int) ($_ENV['RATE_LIMIT_WINDOW'] ?? 60),
    ],
];

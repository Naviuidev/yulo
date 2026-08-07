<?php

declare(strict_types=1);

/**
 * Database seeder - creates admin user with correct password hash
 * Usage: php database/seed.php
 */

$basePath = dirname(__DIR__);

// Load environment
$envFile = $basePath . '/.env';
if (!file_exists($envFile)) {
    $envFile = $basePath . '/.env.example';
}

if (file_exists($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$key, $value] = explode('=', $line, 2);
        $_ENV[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
    }
}

require_once $basePath . '/config/Database.php';

$pdo = Database::getInstance();
$hash = password_hash('Admin@123', PASSWORD_BCRYPT, ['cost' => 12]);

$stmt = $pdo->prepare(
    'INSERT INTO users (name, email, password, role, status, email_verified_at, created_at, updated_at)
     VALUES (:name, :email, :password, :role, :status, NOW(), NOW(), NOW())
     ON DUPLICATE KEY UPDATE password = :password_update, role = :role_update, updated_at = NOW()'
);
$stmt->execute([
    'name' => 'YULO Admin',
    'email' => 'admin@yulo.com',
    'password' => $hash,
    'role' => 'admin',
    'status' => 'active',
    'password_update' => $hash,
    'role_update' => 'admin',
]);

echo "Admin user seeded: admin@yulo.com / Admin@123\n";

#!/usr/bin/env php
<?php
/**
 * YULO Database - Password Hash Generator
 *
 * Generates PHP-compatible bcrypt (PASSWORD_BCRYPT) hashes and outputs
 * ready-to-use SQL INSERT statements for seed users.
 *
 * Usage:
 *   php seed_passwords.php
 *   php seed_passwords.php --hash-only
 *   php seed_passwords.php --password "MyCustomPass"
 */

declare(strict_types=1);

$options = getopt('', ['hash-only', 'password:']);

$users = [
    [
        'id'    => 1,
        'name'  => 'YULO Admin',
        'email' => 'admin@yulo.com',
        'phone' => '+919876543210',
        'password' => 'Admin@123',
        'role'  => 'admin',
        'status' => 'active',
    ],
    [
        'id'    => 2,
        'name'  => 'Demo Customer',
        'email' => 'customer@yulo.com',
        'phone' => '+919876543211',
        'password' => 'Customer@123',
        'role'  => 'customer',
        'status' => 'active',
    ],
    [
        'id'    => 3,
        'name'  => 'Priya Sharma',
        'email' => 'priya@example.com',
        'phone' => '+919876543213',
        'password' => 'Customer@123',
        'role'  => 'customer',
        'status' => 'active',
    ],
];

if (isset($options['password'])) {
    $hash = password_hash($options['password'], PASSWORD_BCRYPT, ['cost' => 12]);
    echo "Password: {$options['password']}\n";
    echo "Hash:     {$hash}\n";
    exit(0);
}

echo "-- ============================================================\n";
echo "-- YULO Seed Users - Generated " . date('Y-m-d H:i:s') . "\n";
echo "-- Run: php seed_passwords.php\n";
echo "-- ============================================================\n\n";

foreach ($users as $user) {
    $hash = password_hash($user['password'], PASSWORD_BCRYPT, ['cost' => 12]);

    echo "-- password: {$user['password']}\n";
    echo "Hash: {$hash}\n";

    if (isset($options['hash-only'])) {
        echo "\n";
        continue;
    }

    echo "INSERT INTO users (id, name, email, password, phone, role, status, email_verified_at, created_at, updated_at)\n";
    echo "VALUES (\n";
    echo "  {$user['id']},\n";
    echo "  '{$user['name']}',\n";
    echo "  '{$user['email']}',\n";
    echo "  '{$hash}',\n";
    echo "  '{$user['phone']}',\n";
    echo "  '{$user['role']}',\n";
    echo "  '{$user['status']}',\n";
    echo "  NOW(),\n";
    echo "  NOW(),\n";
    echo "  NOW()\n";
    echo ");\n\n";
}

if (!isset($options['hash-only'])) {
    echo "-- Verify hashes:\n";
    foreach ($users as $user) {
        $hash = password_hash($user['password'], PASSWORD_BCRYPT, ['cost' => 12]);
        $verified = password_verify($user['password'], $hash) ? 'OK' : 'FAIL';
        echo "-- password_verify('{$user['password']}', hash) => {$verified}\n";
    }
}

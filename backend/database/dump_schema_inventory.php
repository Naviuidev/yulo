#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * Dump a compact schema inventory for local ↔ production comparison.
 *
 * Usage (local):
 *   php database/dump_schema_inventory.php
 *
 * Usage (production via SSH, after fixing SSH access):
 *   ssh USER@HOST 'cd ~/api.yulowear.in && php database/dump_schema_inventory.php'
 *
 * Or paste output from phpMyAdmin:
 *   SHOW TABLES;
 *   SHOW COLUMNS FROM orders WHERE Field IN ('payment_method','email_notified_at');
 *   SHOW TABLES LIKE 'tracking_followups';
 */

$envFile = dirname(__DIR__) . '/.env';
if (is_file($envFile)) {
    foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
            continue;
        }
        [$k, $v] = explode('=', $line, 2);
        $_ENV[trim($k)] = trim($v, " \t\"'");
    }
}

$host = $_ENV['DB_HOST'] ?? '127.0.0.1';
$port = $_ENV['DB_PORT'] ?? '3306';
$name = $_ENV['DB_NAME'] ?? 'yulo_db';
$user = $_ENV['DB_USER'] ?? 'root';
$pass = $_ENV['DB_PASS'] ?? '';

$pdo = new PDO(
    "mysql:host={$host};port={$port};dbname={$name};charset=utf8mb4",
    $user,
    $pass,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
);

echo "DB={$name}@{$host}\n";
echo "TABLES:\n";
$tables = $pdo->query('SHOW TABLES')->fetchAll(PDO::FETCH_COLUMN);
sort($tables);
foreach ($tables as $t) {
    echo "  {$t}\n";
}

$checks = [
    'orders.payment_method',
    'orders.email_notified_at',
    'home_sections.sale_start_date',
    'home_sections.is_locked',
    'tracking_followups.id',
    'deliveries.tracking_number',
];

echo "CHECKS:\n";
foreach ($checks as $check) {
    [$table, $column] = explode('.', $check, 2);
    $stmt = $pdo->prepare(
        'SELECT COLUMN_TYPE FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND COLUMN_NAME = :column'
    );
    $stmt->execute(['schema' => $name, 'table' => $table, 'column' => $column]);
    $type = $stmt->fetchColumn();
    echo $type ? "  OK  {$check} = {$type}\n" : "  MISSING  {$check}\n";
}

echo "EXPECTED_NEW_FOR_THIS_RELEASE:\n";
echo "  - tracking_followups table\n";
echo "  - orders.email_notified_at\n";
echo "  - orders.payment_method includes cashfree\n";

<?php

declare(strict_types=1);

$base = dirname(__DIR__);
foreach (file($base . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) {
        continue;
    }
    [$k, $v] = explode('=', $line, 2);
    $_ENV[trim($k)] = trim($v, " \t\"'");
}

require_once $base . '/config/Database.php';

$pdo = Database::getInstance();
$checks = [
    'admin@yulo.com' => 'Admin@123',
    'customer@yulo.com' => 'Customer@123',
];

foreach ($checks as $email => $password) {
    $stmt = $pdo->prepare('SELECT password FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $hash = $stmt->fetchColumn();
    $ok = $hash && password_verify($password, $hash);
    echo "{$email}: " . ($ok ? "OK\n" : "FAIL\n");
}

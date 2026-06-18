<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/conn.php';

header('Content-Type: text/plain; charset=utf-8');

try {
    $pdo = witnessworld_pdo();
    $pdo->query('SELECT 1');
    $db = $pdo->query('SELECT DATABASE()')->fetchColumn();
    echo "OK: Connected to remote database.\n";
    echo "Database: {$db}\n";
} catch (Throwable $e) {
    echo "FAIL: " . $e->getMessage() . "\n";
    echo "\nIf connecting from XAMPP to Hostinger, whitelist your public IP in hPanel → Databases → Remote MySQL.\n";
}

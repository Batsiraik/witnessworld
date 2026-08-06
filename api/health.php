<?php

declare(strict_types=1);

/**
 * Lightweight ops health check — no auth.
 * GET /api/health.php
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

$started = microtime(true);
$checks = [];
$ok = true;

require_once __DIR__ . '/config.php';

$checks['php'] = [
    'ok' => true,
    'version' => PHP_VERSION,
];

try {
    require_once dirname(__DIR__) . '/admin/includes/conn.php';
    $pdo = witnessworld_pdo();
    $pdo->query('SELECT 1');
    $checks['database'] = [
        'ok' => true,
    ];
} catch (Throwable $e) {
    $ok = false;
    $checks['database'] = [
        'ok' => false,
        'error' => 'Database connection failed',
    ];
}

$root = dirname(__DIR__);
$free = @disk_free_space($root);
$total = @disk_total_space($root);
$checks['disk'] = [
    'ok' => $free !== false && $free > 100 * 1024 * 1024,
    'free_mb' => $free !== false ? (int) round($free / 1048576) : null,
    'total_mb' => $total !== false ? (int) round($total / 1048576) : null,
];
if (!$checks['disk']['ok']) {
    $ok = false;
}

$uploads = $root . '/uploads';
$writable = is_dir($uploads) && is_writable($uploads);
$checks['uploads'] = [
    'ok' => $writable,
    'path' => '/uploads',
];
if (!$writable) {
    $ok = false;
}

$payload = [
    'ok' => $ok,
    'service' => 'witnessworld-api',
    'time' => gmdate('c'),
    'host' => $_SERVER['HTTP_HOST'] ?? null,
    'public_base' => WW_PUBLIC_BASE,
    'latency_ms' => (int) round((microtime(true) - $started) * 1000),
    'checks' => $checks,
];

http_response_code($ok ? 200 : 503);
echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

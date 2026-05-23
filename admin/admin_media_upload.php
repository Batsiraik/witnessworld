<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

$apiConfig = dirname(__DIR__) . '/api/config.php';
if (is_file($apiConfig)) {
    require_once $apiConfig;
}

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    echo json_encode(['ok' => false, 'error' => 'POST required']);
    exit;
}

$kind = strtolower(trim((string) ($_POST['kind'] ?? 'listing')));
$userId = (int) ($_POST['user_id'] ?? 0);
$storeId = (int) ($_POST['store_id'] ?? 0);

if ($userId <= 0) {
    echo json_encode(['ok' => false, 'error' => 'user_id required']);
    exit;
}

if (empty($_FILES['file'])) {
    echo json_encode(['ok' => false, 'error' => 'No file']);
    exit;
}

$root = dirname(__DIR__);

if ($kind === 'listing') {
    $dir = $root . '/uploads/listings/' . $userId;
    $path = '/uploads/listings/' . $userId;
    $allowVideo = !empty($_POST['allow_video']);
    $max = $allowVideo ? 45 * 1024 * 1024 : 5 * 1024 * 1024;
    $result = ww_admin_handle_upload($_FILES['file'], $dir, $path, $max, !$allowVideo);
} elseif ($kind === 'store') {
    $dir = $root . '/uploads/stores/' . $userId;
    $path = '/uploads/stores/' . $userId;
    $result = ww_admin_handle_upload($_FILES['file'], $dir, $path, 5 * 1024 * 1024, true);
} elseif ($kind === 'directory') {
    $dir = $root . '/uploads/directory_logos/' . $userId;
    $path = '/uploads/directory_logos/' . $userId;
    $result = ww_admin_handle_upload($_FILES['file'], $dir, $path, 5 * 1024 * 1024, true);
} elseif ($kind === 'product') {
    if ($storeId <= 0) {
        echo json_encode(['ok' => false, 'error' => 'store_id required for product photo']);
        exit;
    }
    $dir = $root . '/uploads/store-products/' . $storeId;
    $path = '/uploads/store-products/' . $storeId;
    $result = ww_admin_handle_upload($_FILES['file'], $dir, $path, 5 * 1024 * 1024, true);
} else {
    echo json_encode(['ok' => false, 'error' => 'Invalid kind']);
    exit;
}

echo json_encode($result);

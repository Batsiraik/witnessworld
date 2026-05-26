<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

$apiConfig = dirname(__DIR__) . '/api/config.php';
if (is_file($apiConfig)) {
    require_once $apiConfig;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: create_content.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);
$contentType = strtolower(trim((string) ($_POST['content_type'] ?? '')));
$userId = (int) ($_POST['user_id'] ?? 0);

if ($userId <= 0) {
    header('Location: create_content.php?error=' . urlencode('Select a user'));
    exit;
}

$result = ['ok' => false, 'error' => 'Unknown content type'];

switch ($contentType) {
    case 'classified':
    case 'service':
    case 'community':
        $_POST['listing_type'] = $contentType;
        $result = ww_admin_create_listing($pdo, $userId, $adminId, $_POST);
        break;
    case 'store':
        $result = ww_admin_create_store($pdo, $userId, $adminId, $_POST);
        break;
    case 'directory':
        $result = ww_admin_create_directory($pdo, $userId, $adminId, $_POST);
        break;
}

if ($result['ok']) {
    $redirect = (string) ($result['edit_url'] ?? 'index.php');
    header('Location: ' . $redirect . '&created=1');
    exit;
}

header('Location: create_content.php?error=' . urlencode((string) ($result['error'] ?? 'Save failed')) . '&user_id=' . $userId . '&type=' . urlencode($contentType));
exit;

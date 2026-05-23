<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Location: store_add_products.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);
$storeId = (int) ($_POST['store_id'] ?? 0);

if ($storeId <= 0) {
    header('Location: store_add_products.php?error=' . urlencode('Select a store'));
    exit;
}

$result = ww_admin_create_product($pdo, $storeId, $adminId, $_POST);

if ($result['ok']) {
    $another = !empty($_POST['add_another']);
    if ($another) {
        header('Location: store_add_products.php?store_id=' . $storeId . '&saved=1');
        exit;
    }
    header('Location: ' . ($result['edit_url'] ?? 'store_products.php') . '&created=1');
    exit;
}

header('Location: store_add_products.php?store_id=' . $storeId . '&error=' . urlencode((string) ($result['error'] ?? 'Save failed')));
exit;

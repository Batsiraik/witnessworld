<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$userId = (int) $user['id'];
$storeId = (int) ($_GET['store_id'] ?? 0);
if ($storeId <= 0) {
    ww_json(['ok' => false, 'error' => 'store_id required'], 422);
}

try {
    $st = $pdo->prepare('SELECT id, user_id, moderation_status FROM stores WHERE id = ? LIMIT 1');
    $st->execute([$storeId]);
    $store = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$store || (int) $store['user_id'] !== $userId) {
    ww_json(['ok' => false, 'error' => 'Store not found'], 404);
}

try {
    $st = $pdo->prepare(
        'SELECT id, store_id, name, description, specifications, price_amount, currency,
                image_url, moderation_status, admin_note, created_at, updated_at
         FROM store_products
         WHERE store_id = ?
         ORDER BY id DESC'
    );
    $st->execute([$storeId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Products unavailable'], 500);
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id' => (int) $r['id'],
        'store_id' => (int) $r['store_id'],
        'name' => (string) $r['name'],
        'description' => $r['description'] ? (string) $r['description'] : null,
        'specifications' => $r['specifications'] ? (string) $r['specifications'] : null,
        'price_amount' => (string) $r['price_amount'],
        'currency' => (string) $r['currency'],
        'image_url' => $r['image_url'] ? (string) $r['image_url'] : null,
        'moderation_status' => (string) $r['moderation_status'],
        'admin_note' => $r['admin_note'] ? (string) $r['admin_note'] : null,
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
    ];
}

ww_json([
    'ok' => true,
    'store_moderation_status' => (string) $store['moderation_status'],
    'products' => $list,
]);

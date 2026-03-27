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

if (($user['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid store id'], 422);
}

$limit = (int) ($_GET['products_limit'] ?? 48);
if ($limit < 0) {
    $limit = 0;
}
if ($limit > 80) {
    $limit = 80;
}

try {
    $st = $pdo->prepare(
        'SELECT s.*, u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
         FROM stores s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.id = ? AND s.moderation_status = ?
         LIMIT 1'
    );
    $st->execute([$id, 'approved']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Store not found'], 404);
}

$storeOwnerId = (int) ($row['user_id'] ?? 0);
$viewerId = (int) $user['id'];
$isOwner = $storeOwnerId === $viewerId;

$products = [];
if ($limit > 0) {
    try {
        if ($isOwner) {
            $st = $pdo->prepare(
                'SELECT id, name, description, price_amount, currency, image_url, moderation_status, created_at
                 FROM store_products
                 WHERE store_id = ? AND moderation_status IN (\'approved\', \'pending_approval\')
                 ORDER BY id DESC
                 LIMIT ' . (int) $limit
            );
            $st->execute([$id]);
        } else {
            $st = $pdo->prepare(
                'SELECT id, name, description, price_amount, currency, image_url, moderation_status, created_at
                 FROM store_products
                 WHERE store_id = ? AND moderation_status = ?
                 ORDER BY id DESC
                 LIMIT ' . (int) $limit
            );
            $st->execute([$id, 'approved']);
        }
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $p) {
            $products[] = [
                'id' => (int) $p['id'],
                'name' => (string) $p['name'],
                'description' => $p['description'] ? (string) $p['description'] : null,
                'price_amount' => (string) $p['price_amount'],
                'currency' => (string) $p['currency'],
                'image_url' => $p['image_url'] ? (string) $p['image_url'] : null,
                'moderation_status' => (string) ($p['moderation_status'] ?? ''),
                'created_at' => (string) $p['created_at'],
            ];
        }
    } catch (Throwable) {
        ww_json(['ok' => false, 'error' => 'Products unavailable'], 500);
    }
}

ww_json([
    'ok' => true,
    'store' => [
        'id' => (int) $row['id'],
        'name' => (string) $row['name'],
        'description' => (string) $row['description'],
        'sells_summary' => (string) $row['sells_summary'],
        'logo_url' => (string) $row['logo_url'],
        'banner_url' => $row['banner_url'] ? (string) $row['banner_url'] : null,
        'location_country_code' => (string) $row['location_country_code'],
        'location_country_name' => (string) $row['location_country_name'],
        'location_us_state' => $row['location_us_state'] ? (string) $row['location_us_state'] : null,
        'delivery_type' => (string) $row['delivery_type'],
        'delivery_notes' => $row['delivery_notes'] ? (string) $row['delivery_notes'] : null,
        'created_at' => (string) $row['created_at'],
        'seller' => [
            'user_id' => (int) $row['seller_user_id'],
            'username' => (string) $row['username'],
            'label' => trim((string) $row['first_name'] . ' ' . (string) $row['last_name']),
            'avatar_url' => $row['avatar_url'] ? (string) $row['avatar_url'] : null,
        ],
        'products' => $products,
    ],
]);

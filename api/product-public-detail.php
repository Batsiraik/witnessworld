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
    ww_json(['ok' => false, 'error' => 'Invalid product id'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT p.*, s.id AS store_id, s.name AS store_name, s.logo_url AS store_logo_url,
                s.description AS store_description, s.moderation_status AS store_status,
                s.location_country_name, s.location_us_state, s.delivery_type,
                u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
         FROM store_products p
         INNER JOIN stores s ON s.id = p.store_id
         INNER JOIN users u ON u.id = s.user_id
         WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
         LIMIT 1'
    );
    $st->execute([$id, 'approved', 'approved']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Product not found'], 404);
}

ww_json([
    'ok' => true,
    'product' => [
        'id' => (int) $row['id'],
        'store_id' => (int) $row['store_id'],
        'name' => (string) $row['name'],
        'description' => $row['description'] ? (string) $row['description'] : null,
        'specifications' => $row['specifications'] ? (string) $row['specifications'] : null,
        'price_amount' => (string) $row['price_amount'],
        'currency' => (string) $row['currency'],
        'image_url' => $row['image_url'] ? (string) $row['image_url'] : null,
        'created_at' => (string) $row['created_at'],
    ],
    'store' => [
        'id' => (int) $row['store_id'],
        'name' => (string) $row['store_name'],
        'logo_url' => (string) $row['store_logo_url'],
        'description' => (string) $row['store_description'],
        'location_country_name' => (string) $row['location_country_name'],
        'location_us_state' => $row['location_us_state'] ? (string) $row['location_us_state'] : null,
        'delivery_type' => (string) $row['delivery_type'],
    ],
    'seller' => [
        'user_id' => (int) $row['seller_user_id'],
        'username' => (string) $row['username'],
        'label' => trim((string) $row['first_name'] . ' ' . (string) $row['last_name']),
        'avatar_url' => $row['avatar_url'] ? (string) $row['avatar_url'] : null,
    ],
]);

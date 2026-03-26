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

$userId = (int) $user['id'];
$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid product id'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT p.*, s.user_id AS store_owner_id, s.moderation_status AS store_status
         FROM store_products p
         INNER JOIN stores s ON s.id = p.store_id
         WHERE p.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row || (int) $row['store_owner_id'] !== $userId) {
    ww_json(['ok' => false, 'error' => 'Product not found'], 404);
}

if ((string) ($row['moderation_status'] ?? '') === 'removed') {
    ww_json(['ok' => false, 'error' => 'This product was removed and cannot be edited'], 403);
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
        'moderation_status' => (string) $row['moderation_status'],
        'admin_note' => $row['admin_note'] ? (string) $row['admin_note'] : null,
    ],
    'store_moderation_status' => (string) $row['store_status'],
]);

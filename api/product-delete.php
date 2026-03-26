<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
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
$body = ww_read_json();
$productId = (int) ($body['product_id'] ?? 0);
if ($productId <= 0) {
    ww_json(['ok' => false, 'error' => 'product_id required'], 422);
}

try {
    $del = $pdo->prepare(
        'DELETE p FROM store_products p
         INNER JOIN stores s ON s.id = p.store_id
         WHERE p.id = ? AND s.user_id = ? AND s.moderation_status = ?'
    );
    $del->execute([$productId, $userId, 'approved']);
    if ($del->rowCount() === 0) {
        ww_json(['ok' => false, 'error' => 'Product not found or store is not approved'], 404);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not delete'], 500);
}

ww_json(['ok' => true, 'message' => 'Product deleted.']);

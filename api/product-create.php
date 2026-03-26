<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/store_helpers.php';

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

$storeId = (int) ($body['store_id'] ?? 0);
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

if ((string) ($store['moderation_status'] ?? '') !== 'approved') {
    ww_json(['ok' => false, 'error' => 'Your store must be approved before you can add products'], 403);
}

$name = trim((string) ($body['name'] ?? ''));
if ($name === '' || mb_strlen($name) > 255) {
    ww_json(['ok' => false, 'error' => 'Product name is required (max 255 characters)'], 422);
}

$description = trim((string) ($body['description'] ?? ''));
if (mb_strlen($description) > 8000) {
    ww_json(['ok' => false, 'error' => 'Description is too long'], 422);
}
$descDb = $description !== '' ? $description : null;

$specs = trim((string) ($body['specifications'] ?? ''));
if (mb_strlen($specs) > 8000) {
    ww_json(['ok' => false, 'error' => 'Specifications are too long'], 422);
}
$specsDb = $specs !== '' ? $specs : null;

$priceRaw = $body['price_amount'] ?? null;
if ($priceRaw === null || $priceRaw === '') {
    ww_json(['ok' => false, 'error' => 'price_amount is required'], 422);
}
if (is_string($priceRaw)) {
    $priceRaw = str_replace(',', '', $priceRaw);
}
if (!is_numeric($priceRaw)) {
    ww_json(['ok' => false, 'error' => 'price_amount must be a number'], 422);
}
$priceF = (float) $priceRaw;
if ($priceF < 0 || $priceF > 99999999.99) {
    ww_json(['ok' => false, 'error' => 'Invalid price'], 422);
}
$priceStr = number_format($priceF, 2, '.', '');

$currency = strtoupper(trim((string) ($body['currency'] ?? 'USD')));
if (!preg_match('/^[A-Z]{3}$/', $currency)) {
    ww_json(['ok' => false, 'error' => 'currency must be a 3-letter code (e.g. USD)'], 422);
}

$imageUrl = trim((string) ($body['image_url'] ?? ''));
if ($imageUrl === '' || !ww_store_product_image_url_belongs_to_store($imageUrl, $storeId)) {
    ww_json(['ok' => false, 'error' => 'Product photo is required — upload in the app'], 422);
}
$imageDb = $imageUrl;

try {
    $ins = $pdo->prepare(
        'INSERT INTO store_products (
            store_id, name, description, specifications, price_amount, currency, image_url, moderation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $storeId,
        $name,
        $descDb,
        $specsDb,
        $priceStr,
        $currency,
        $imageDb,
        'pending_approval',
    ]);
    $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
    if (str_contains($e->getMessage(), 'Unknown column') || str_contains($e->getMessage(), "doesn't exist")) {
        ww_json(['ok' => false, 'error' => 'Database is missing store/product tables. See database/README.md.'], 500);
    }
    throw $e;
}

ww_json([
    'ok' => true,
    'product_id' => $id,
    'moderation_status' => 'pending_approval',
    'message' => 'Product submitted for review. It will appear in your store after approval.',
]);

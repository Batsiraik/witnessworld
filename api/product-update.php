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

$productId = (int) ($body['product_id'] ?? 0);
if ($productId <= 0) {
    ww_json(['ok' => false, 'error' => 'product_id required'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT p.*, s.user_id AS owner_id, s.moderation_status AS store_status
         FROM store_products p
         INNER JOIN stores s ON s.id = p.store_id
         WHERE p.id = ? LIMIT 1'
    );
    $st->execute([$productId]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$existing || (int) $existing['owner_id'] !== $userId) {
    ww_json(['ok' => false, 'error' => 'Product not found'], 404);
}

if ((string) ($existing['store_status'] ?? '') !== 'approved') {
    ww_json(['ok' => false, 'error' => 'Store must be approved'], 403);
}

$pMod = (string) ($existing['moderation_status'] ?? '');
if ($pMod === 'removed') {
    ww_json(['ok' => false, 'error' => 'This product was removed and cannot be edited'], 403);
}

$storeId = (int) $existing['store_id'];

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
    ww_json(['ok' => false, 'error' => 'currency must be a 3-letter code'], 422);
}

$imageUrl = trim((string) ($body['image_url'] ?? ''));
$existingImg = trim((string) ($existing['image_url'] ?? ''));
if ($imageUrl !== '') {
    if (!ww_store_product_image_url_belongs_to_store($imageUrl, $storeId)) {
        ww_json(['ok' => false, 'error' => 'Invalid product image URL'], 422);
    }
    $imageDb = $imageUrl;
} elseif ($existingImg !== '' && ww_store_product_image_url_belongs_to_store($existingImg, $storeId)) {
    $imageDb = $existingImg;
} else {
    ww_json(['ok' => false, 'error' => 'Product photo is required — upload in the app'], 422);
}

$demote = in_array($pMod, ['approved', 'rejected'], true);
$newStatus = $demote ? 'pending_approval' : $pMod;
$adminNote = $demote ? null : ($existing['admin_note'] ?? null);
$reviewedAt = $demote ? null : ($existing['reviewed_at'] ?? null);
$reviewedBy = $demote ? null : ($existing['reviewed_by_admin_id'] ?? null);

try {
    $upd = $pdo->prepare(
        'UPDATE store_products SET
            name = ?, description = ?, specifications = ?, price_amount = ?, currency = ?, image_url = ?,
            moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ?
         WHERE id = ?'
    );
    $upd->execute([
        $name,
        $descDb,
        $specsDb,
        $priceStr,
        $currency,
        $imageDb,
        $newStatus,
        $adminNote,
        $reviewedAt,
        $reviewedBy,
        $productId,
    ]);
} catch (Throwable $e) {
    if (str_contains($e->getMessage(), 'Unknown column')) {
        ww_json(['ok' => false, 'error' => 'Store product tables missing or out of date. See database/README.md.'], 500);
    }
    throw $e;
}

$msg = $demote
    ? 'Product updated and sent for review again.'
    : 'Product updated.';

ww_json(['ok' => true, 'message' => $msg, 'moderation_status' => $newStatus]);

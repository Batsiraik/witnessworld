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
$viewer = ww_user_from_token($pdo, $tok);
if (!$viewer) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

if (($viewer['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$targetId = (int) ($_GET['user_id'] ?? 0);
if ($targetId <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid user id'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT id, username, first_name, last_name, avatar_url, status
         FROM users WHERE id = ? LIMIT 1'
    );
    $st->execute([$targetId]);
    $peer = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$peer || ($peer['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Profile not found'], 404);
}

$fn = trim((string) ($peer['first_name'] ?? ''));
$ln = trim((string) ($peer['last_name'] ?? ''));
$label = trim($fn . ' ' . $ln);
if ($label === '') {
    $label = (string) ($peer['username'] ?? '');
}

$listings = [];
try {
    $lq = $pdo->prepare(
        'SELECT id, listing_type, title, media_url, price_amount, currency, pricing_type
         FROM listings
         WHERE user_id = ? AND moderation_status = ? AND listing_type IN (?, ?)
         ORDER BY updated_at DESC
         LIMIT 60'
    );
    $lq->execute([$targetId, 'approved', 'classified', 'service']);
    while ($row = $lq->fetch(PDO::FETCH_ASSOC)) {
        $listings[] = [
            'id' => (int) $row['id'],
            'listing_type' => (string) $row['listing_type'],
            'title' => (string) $row['title'],
            'media_url' => (string) ($row['media_url'] ?? ''),
            'price_amount' => $row['price_amount'] !== null && $row['price_amount'] !== '' ? (string) $row['price_amount'] : null,
            'currency' => (string) ($row['currency'] ?? ''),
            'pricing_type' => (string) ($row['pricing_type'] ?? ''),
        ];
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

ww_json([
    'ok' => true,
    'member' => [
        'user_id' => (int) $peer['id'],
        'username' => (string) $peer['username'],
        'label' => $label,
        'avatar_url' => $peer['avatar_url'] !== null && (string) $peer['avatar_url'] !== '' ? (string) $peer['avatar_url'] : null,
    ],
    'listings' => $listings,
]);

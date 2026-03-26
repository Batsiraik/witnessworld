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
    ww_json(['ok' => false, 'error' => 'Invalid store id'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM stores WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$id, $userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Store not found'], 404);
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
        'moderation_status' => (string) $row['moderation_status'],
        'admin_note' => $row['admin_note'] ? (string) $row['admin_note'] : null,
    ],
]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/directory_helpers.php';

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
    ww_json(['ok' => false, 'error' => 'Invalid id'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM directory_entries WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$id, $userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Not found'], 404);
}

$cats = ww_directory_categories();
$slug = (string) $row['category'];

ww_json([
    'ok' => true,
    'entry' => [
        'id' => (int) $row['id'],
        'business_name' => (string) $row['business_name'],
        'tagline' => $row['tagline'] ? (string) $row['tagline'] : null,
        'description' => $row['description'] ? (string) $row['description'] : null,
        'category' => $slug,
        'category_label' => $cats[$slug] ?? $slug,
        'location_country_code' => (string) $row['location_country_code'],
        'location_country_name' => (string) $row['location_country_name'],
        'location_us_state' => $row['location_us_state'] ? (string) $row['location_us_state'] : null,
        'address_line' => $row['address_line'] ? (string) $row['address_line'] : null,
        'city' => (string) $row['city'],
        'postal_code' => $row['postal_code'] ? (string) $row['postal_code'] : null,
        'phone' => (string) $row['phone'],
        'email' => (string) $row['email'],
        'website' => $row['website'] ? (string) $row['website'] : null,
        'map_url' => $row['map_url'] ? (string) $row['map_url'] : null,
        'hours_text' => $row['hours_text'] ? (string) $row['hours_text'] : null,
        'logo_url' => $row['logo_url'] ? (string) $row['logo_url'] : null,
        'moderation_status' => (string) $row['moderation_status'],
        'admin_note' => $row['admin_note'] ? (string) $row['admin_note'] : null,
    ],
]);

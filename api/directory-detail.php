<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/directory_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid id'], 422);
}

$pdo = witnessworld_pdo();

try {
    $st = $pdo->prepare(
        'SELECT d.*, u.username, u.first_name, u.last_name
         FROM directory_entries d
         INNER JOIN users u ON u.id = d.user_id
         WHERE d.id = ? AND d.moderation_status = ?
         LIMIT 1'
    );
    $st->execute([$id, 'approved']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Directory unavailable'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Business not found'], 404);
}

$slug = (string) $row['category'];
$cats = ww_directory_categories();

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
        'owner_user_id' => (int) $row['user_id'],
        'owner_label' => trim((string) $row['first_name'] . ' ' . (string) $row['last_name']),
        'owner_username' => (string) $row['username'],
    ],
]);

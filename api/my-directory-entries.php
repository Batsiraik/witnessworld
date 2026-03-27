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

$userId = (int) $user['id'];
$cats = ww_directory_categories();

try {
    $st = $pdo->prepare(
        'SELECT id, business_name, tagline, category, city, location_country_name, location_us_state,
                logo_url, moderation_status, created_at, updated_at
         FROM directory_entries
         WHERE user_id = ?
         ORDER BY id DESC'
    );
    $st->execute([$userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not load directory entries'], 500);
}

$list = [];
foreach ($rows as $r) {
    $slug = (string) $r['category'];
    $list[] = [
        'id' => (int) $r['id'],
        'business_name' => (string) $r['business_name'],
        'tagline' => $r['tagline'] ? (string) $r['tagline'] : null,
        'category' => $slug,
        'category_label' => $cats[$slug] ?? $slug,
        'city' => (string) $r['city'],
        'location_country_name' => (string) $r['location_country_name'],
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'logo_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
        'moderation_status' => (string) $r['moderation_status'],
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
    ];
}

ww_json(['ok' => true, 'entries' => $list]);

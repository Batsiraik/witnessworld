<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/marketplace_helpers.php';

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

$listingType = strtolower(trim((string) ($_GET['listing_type'] ?? '')));
if (!in_array($listingType, ['classified', 'service'], true)) {
    ww_json(['ok' => false, 'error' => 'listing_type must be classified or service'], 422);
}

$country = strtoupper(trim((string) ($_GET['country'] ?? '')));
$usState = trim((string) ($_GET['us_state'] ?? ''));
if ($usState !== '' && strlen($usState) > 64) {
    ww_json(['ok' => false, 'error' => 'Invalid us_state'], 422);
}

$priceMin = isset($_GET['price_min']) ? (string) $_GET['price_min'] : '';
$priceMax = isset($_GET['price_max']) ? (string) $_GET['price_max'] : '';

$q = trim((string) ($_GET['q'] ?? ''));
if (mb_strlen($q) > 80) {
    ww_json(['ok' => false, 'error' => 'Search too long'], 422);
}

$limit = ww_marketplace_int_bounds((int) ($_GET['limit'] ?? 40), 1, 80, 40);
$offset = ww_marketplace_int_bounds((int) ($_GET['offset'] ?? 0), 0, 100000, 0);

$sql = 'SELECT l.id, l.title, l.description, l.price_amount, l.pricing_type, l.currency, l.media_url,
        l.location_country_code, l.location_country_name, l.location_us_state, l.created_at,
        u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
        FROM listings l
        INNER JOIN users u ON u.id = l.user_id
        WHERE l.moderation_status = ? AND l.listing_type = ?';
$params = ['approved', $listingType];

if ($country !== '' && strlen($country) === 2) {
    $sql .= ' AND l.location_country_code = ?';
    $params[] = $country;
}

if ($usState !== '') {
    $sql .= ' AND l.location_us_state = ?';
    $params[] = $usState;
}

if ($priceMin !== '' && is_numeric($priceMin)) {
    $sql .= ' AND l.price_amount IS NOT NULL AND l.price_amount >= ?';
    $params[] = $priceMin;
}
if ($priceMax !== '' && is_numeric($priceMax)) {
    $sql .= ' AND l.price_amount IS NOT NULL AND l.price_amount <= ?';
    $params[] = $priceMax;
}

if ($q !== '') {
    $qEsc = ww_marketplace_like_escape($q);
    $like = '%' . $qEsc . '%';
    $sql .= ' AND (l.title LIKE ? ESCAPE \'\\\\\' OR l.description LIKE ? ESCAPE \'\\\\\')';
    $params[] = $like;
    $params[] = $like;
}

$sql .= ' ORDER BY l.id DESC LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;

try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Listings unavailable'], 500);
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id' => (int) $r['id'],
        'title' => (string) $r['title'],
        'description' => (string) $r['description'],
        'price_amount' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
        'pricing_type' => (string) $r['pricing_type'],
        'currency' => (string) $r['currency'],
        'media_url' => $r['media_url'] ? (string) $r['media_url'] : null,
        'location_country_code' => $r['location_country_code'] ? (string) $r['location_country_code'] : null,
        'location_country_name' => $r['location_country_name'] ? (string) $r['location_country_name'] : null,
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'created_at' => (string) $r['created_at'],
        'seller_user_id' => (int) $r['seller_user_id'],
        'seller_username' => (string) $r['username'],
        'seller_label' => trim((string) $r['first_name'] . ' ' . (string) $r['last_name']),
        'seller_avatar_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
    ];
}

ww_json(['ok' => true, 'listings' => $list]);

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

$country = strtoupper(trim((string) ($_GET['country'] ?? '')));
$usState = trim((string) ($_GET['us_state'] ?? ''));
if ($usState !== '' && strlen($usState) > 64) {
    ww_json(['ok' => false, 'error' => 'Invalid us_state'], 422);
}

$q = trim((string) ($_GET['q'] ?? ''));
if (mb_strlen($q) > 80) {
    ww_json(['ok' => false, 'error' => 'Search too long'], 422);
}

$limit = ww_marketplace_int_bounds((int) ($_GET['limit'] ?? 40), 1, 80, 40);
$offset = ww_marketplace_int_bounds((int) ($_GET['offset'] ?? 0), 0, 100000, 0);

$sql = 'SELECT s.id, s.name, s.description, s.sells_summary, s.logo_url, s.banner_url,
        s.location_country_code, s.location_country_name, s.location_us_state, s.delivery_type, s.created_at,
        s.user_id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
        FROM stores s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.moderation_status = ?';
$params = ['approved'];

if ($country !== '' && strlen($country) === 2) {
    $sql .= ' AND s.location_country_code = ?';
    $params[] = $country;
}

if ($usState !== '') {
    $sql .= ' AND s.location_us_state = ?';
    $params[] = $usState;
}

if ($q !== '') {
    $qEsc = ww_marketplace_like_escape($q);
    $like = '%' . $qEsc . '%';
    $sql .= ' AND (s.name LIKE ? ESCAPE \'\\\\\' OR s.description LIKE ? ESCAPE \'\\\\\' OR s.sells_summary LIKE ? ESCAPE \'\\\\\')';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql .= ' ORDER BY s.id DESC LIMIT ' . (int) $limit . ' OFFSET ' . (int) $offset;

try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Stores unavailable'], 500);
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id' => (int) $r['id'],
        'name' => (string) $r['name'],
        'description' => (string) $r['description'],
        'sells_summary' => (string) $r['sells_summary'],
        'logo_url' => (string) $r['logo_url'],
        'banner_url' => $r['banner_url'] ? (string) $r['banner_url'] : null,
        'location_country_code' => (string) $r['location_country_code'],
        'location_country_name' => (string) $r['location_country_name'],
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'delivery_type' => (string) $r['delivery_type'],
        'created_at' => (string) $r['created_at'],
        'seller_user_id' => (int) $r['seller_user_id'],
        'seller_username' => (string) $r['username'],
        'seller_label' => trim((string) $r['first_name'] . ' ' . (string) $r['last_name']),
        'seller_avatar_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
    ];
}

ww_json(['ok' => true, 'stores' => $list]);
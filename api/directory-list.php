<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$country = strtoupper(trim((string) ($_GET['country'] ?? $_GET['location_country_code'] ?? '')));
if ($country === '' || strlen($country) !== 2) {
    ww_json(['ok' => false, 'error' => 'country query is required (2-letter code, e.g. US)'], 422);
}

$usStateFilter = trim((string) ($_GET['us_state'] ?? ''));
if ($usStateFilter !== '' && strlen($usStateFilter) > 64) {
    ww_json(['ok' => false, 'error' => 'Invalid us_state filter'], 422);
}

$categoryIdFilter = (int) ($_GET['category_id'] ?? 0);

$q = trim((string) ($_GET['q'] ?? ''));
if (mb_strlen($q) > 80) {
    ww_json(['ok' => false, 'error' => 'Search query too long'], 422);
}

$limit = (int) ($_GET['limit'] ?? 80);
if ($limit < 1) {
    $limit = 1;
}
if ($limit > 120) {
    $limit = 120;
}

$pdo = witnessworld_pdo();

$sql = 'SELECT d.id, d.business_name, d.tagline, d.category, d.category_id,
        d.city, d.location_us_state, d.location_country_name,
        d.logo_url, d.phone, d.email, d.website, d.map_url,
        dc.name AS category_name
        FROM directory_entries d
        LEFT JOIN directory_categories dc ON dc.id = d.category_id
        WHERE d.moderation_status = ? AND d.location_country_code = ?';
$params = ['approved', $country];

if ($usStateFilter !== '') {
    $sql .= ' AND d.location_us_state = ?';
    $params[] = $usStateFilter;
}

if ($categoryIdFilter > 0) {
    $sql .= ' AND d.category_id = ?';
    $params[] = $categoryIdFilter;
}

if ($q !== '') {
    $qEsc = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $q);
    $like = '%' . $qEsc . '%';
    $sql .= ' AND (d.business_name LIKE ? ESCAPE \'\\\\\' OR d.tagline LIKE ? ESCAPE \'\\\\\' OR d.city LIKE ? ESCAPE \'\\\\\' OR d.address_line LIKE ? ESCAPE \'\\\\\')';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
}

$sql .= ' ORDER BY d.business_name ASC LIMIT ' . (int) $limit;

try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Directory unavailable'], 500);
}

$out = [];
foreach ($rows as $r) {
    $out[] = [
        'id' => (int) $r['id'],
        'business_name' => (string) $r['business_name'],
        'tagline' => $r['tagline'] ? (string) $r['tagline'] : null,
        'category_name' => $r['category_name'] ? (string) $r['category_name'] : ($r['category'] ? (string) $r['category'] : null),
        'city' => (string) $r['city'],
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'location_country_name' => (string) $r['location_country_name'],
        'logo_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
        'phone' => (string) $r['phone'],
        'email' => (string) $r['email'],
        'website' => $r['website'] ? (string) $r['website'] : null,
        'map_url' => $r['map_url'] ? (string) $r['map_url'] : null,
    ];
}

ww_json(['ok' => true, 'entries' => $out]);

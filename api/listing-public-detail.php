<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/listing_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$pdo = witnessworld_pdo();

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid listing id'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT l.*, u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url,
                COALESCE(mc.name, sc.name, cc.name) AS category_name
         FROM listings l
         INNER JOIN users u ON u.id = l.user_id
         LEFT JOIN marketplace_categories mc ON mc.id = l.category_id AND l.listing_type = \'classified\'
         LEFT JOIN service_categories sc ON sc.id = l.category_id AND l.listing_type = \'service\'
         LEFT JOIN community_categories cc ON cc.id = l.category_id AND l.listing_type = \'community\'
         WHERE l.id = ? AND l.moderation_status = ?
         LIMIT 1'
    );
    $st->execute([$id, 'approved']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Listing not found'], 404);
}

$portfolio = [];
if (!empty($row['portfolio_urls_json'])) {
    $decoded = json_decode((string) $row['portfolio_urls_json'], true);
    if (is_array($decoded)) {
        foreach ($decoded as $u) {
            if (is_string($u) && $u !== '') {
                $portfolio[] = $u;
            }
        }
    }
}

$skills = [];
if (!empty($row['soft_skills_json'])) {
    $dec = json_decode((string) $row['soft_skills_json'], true);
    if (is_array($dec)) {
        foreach ($dec as $s) {
            if (is_string($s) && $s !== '') {
                $skills[] = $s;
            }
        }
    }
}

$cc = strtoupper(trim((string) ($row['location_country_code'] ?? '')));
$usStateName = trim((string) ($row['location_us_state'] ?? ''));
$usStateCode = null;
if ($cc === 'US' && $usStateName !== '') {
    $usStateCode = ww_listing_us_state_code_from_name($usStateName);
}

ww_json([
    'ok' => true,
    'listing' => [
        'id' => (int) $row['id'],
        'listing_type' => (string) $row['listing_type'],
        'category_name' => $row['category_name'] ? (string) $row['category_name'] : null,
        'title' => (string) $row['title'],
        'description' => (string) $row['description'],
        'price_amount' => $row['price_amount'] !== null ? (string) $row['price_amount'] : null,
        'is_free' => (int) ($row['is_free'] ?? 0) === 1,
        'pricing_type' => (string) $row['pricing_type'],
        'currency' => (string) $row['currency'],
        'media_url' => $row['media_url'] ? (string) $row['media_url'] : '',
        'video_url' => $row['video_url'] ? (string) $row['video_url'] : '',
        'portfolio_urls' => $portfolio,
        'soft_skills' => $skills,
        'location_country_code' => $cc,
        'location_country_name' => $row['location_country_name'] ? (string) $row['location_country_name'] : null,
        'location_us_state' => $usStateName !== '' ? $usStateName : null,
        'location_us_state_code' => $usStateCode,
        'created_at' => (string) $row['created_at'],
        'seller' => [
            'user_id' => (int) $row['seller_user_id'],
            'username' => (string) $row['username'],
            'label' => trim((string) $row['first_name'] . ' ' . (string) $row['last_name']),
            'avatar_url' => $row['avatar_url'] ? (string) $row['avatar_url'] : null,
        ],
    ],
]);

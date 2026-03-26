<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/listing_helpers.php';

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

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid listing id'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT l.*, u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
         FROM listings l
         INNER JOIN users u ON u.id = l.user_id
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
        'title' => (string) $row['title'],
        'description' => (string) $row['description'],
        'price_amount' => $row['price_amount'] !== null ? (string) $row['price_amount'] : null,
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

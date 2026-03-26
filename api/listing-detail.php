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

$userId = (int) $user['id'];
$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid listing id'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM listings WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$id, $userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Listing not found'], 404);
}

if (($row['moderation_status'] ?? '') === 'removed') {
    ww_json(['ok' => false, 'error' => 'This listing was removed and cannot be edited'], 403);
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
        'moderation_status' => (string) $row['moderation_status'],
        'media_url' => $row['media_url'] ? (string) $row['media_url'] : '',
        'video_url' => $row['video_url'] ? (string) $row['video_url'] : '',
        'portfolio_urls' => $portfolio,
        'soft_skills' => $skills,
        'location_country_code' => $cc,
        'location_us_state_code' => $usStateCode,
    ],
]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/listing_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
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

$avatar = trim((string) ($user['avatar_url'] ?? ''));
if ($avatar === '') {
    ww_json(['ok' => false, 'error' => 'Upload a profile photo in Profile & settings first'], 422);
}

$userId = (int) $user['id'];
$body = ww_read_json();

$listingId = (int) ($body['listing_id'] ?? 0);
if ($listingId <= 0) {
    ww_json(['ok' => false, 'error' => 'listing_id required'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM listings WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$listingId, $userId]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$existing) {
    ww_json(['ok' => false, 'error' => 'Listing not found'], 404);
}

$mod = (string) ($existing['moderation_status'] ?? '');
if ($mod === 'removed') {
    ww_json(['ok' => false, 'error' => 'This listing was removed and cannot be edited'], 403);
}

$listingType = strtolower(trim((string) ($body['listing_type'] ?? '')));
if (!in_array($listingType, ['classified', 'service'], true)) {
    ww_json(['ok' => false, 'error' => 'listing_type must be classified or service'], 422);
}

$title = trim((string) ($body['title'] ?? ''));
if ($title === '' || mb_strlen($title) > 255) {
    ww_json(['ok' => false, 'error' => 'Title is required (max 255 characters)'], 422);
}

$description = trim((string) ($body['description'] ?? ''));
if ($description === '' || mb_strlen($description) > 12000) {
    ww_json(['ok' => false, 'error' => 'Description is required (max 12000 characters)'], 422);
}

$mediaUrl = trim((string) ($body['media_url'] ?? ''));
if ($mediaUrl === '' || !ww_listing_url_belongs_to_user($mediaUrl, $userId)) {
    ww_json(['ok' => false, 'error' => 'Main image is required'], 422);
}

$videoUrl = trim((string) ($body['video_url'] ?? ''));
if ($videoUrl !== '' && !ww_listing_url_belongs_to_user($videoUrl, $userId)) {
    ww_json(['ok' => false, 'error' => 'Invalid video URL'], 422);
}

$portfolioIn = $body['portfolio_urls'] ?? [];
if (!is_array($portfolioIn)) {
    ww_json(['ok' => false, 'error' => 'portfolio_urls must be an array'], 422);
}
$portfolio = [];
foreach ($portfolioIn as $u) {
    $u = trim((string) $u);
    if ($u === '') {
        continue;
    }
    if (!ww_listing_url_belongs_to_user($u, $userId)) {
        ww_json(['ok' => false, 'error' => 'Invalid portfolio image URL'], 422);
    }
    $portfolio[] = $u;
    if (count($portfolio) > 12) {
        ww_json(['ok' => false, 'error' => 'At most 12 portfolio images'], 422);
    }
}

$skillsIn = $body['soft_skills'] ?? [];
if (!is_array($skillsIn)) {
    ww_json(['ok' => false, 'error' => 'soft_skills must be an array'], 422);
}
$skills = [];
foreach ($skillsIn as $s) {
    $s = trim((string) $s);
    if ($s === '') {
        continue;
    }
    if (mb_strlen($s) > 60) {
        ww_json(['ok' => false, 'error' => 'Each soft skill must be 60 characters or less'], 422);
    }
    $skills[] = $s;
    if (count($skills) > 24) {
        ww_json(['ok' => false, 'error' => 'At most 24 soft skills'], 422);
    }
}

$countryCode = strtoupper(trim((string) ($body['location_country_code'] ?? '')));
$countryMap = ww_listing_country_map();
if ($countryCode === '' || !isset($countryMap[$countryCode])) {
    ww_json(['ok' => false, 'error' => 'Select a valid country'], 422);
}
$countryName = $countryMap[$countryCode];

$usStateName = null;
if ($countryCode === 'US') {
    $stateCode = strtoupper(trim((string) ($body['location_us_state_code'] ?? '')));
    $stateMap = ww_listing_us_state_map();
    if ($stateCode === '' || !isset($stateMap[$stateCode])) {
        ww_json(['ok' => false, 'error' => 'Select a U.S. state'], 422);
    }
    $usStateName = $stateMap[$stateCode];
}

$portfolioJson = $portfolio === [] ? null : json_encode($portfolio, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$skillsJson = $skills === [] ? null : json_encode($skills, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
$videoDb = $videoUrl !== '' ? $videoUrl : null;

$demote = in_array($mod, ['approved', 'rejected'], true);
$newStatus = $demote ? 'pending_approval' : $mod;
$adminNote = $demote ? null : ($existing['admin_note'] ?? null);
$reviewedAt = $demote ? null : ($existing['reviewed_at'] ?? null);
$reviewedBy = $demote ? null : ($existing['reviewed_by_admin_id'] ?? null);

try {
    $upd = $pdo->prepare(
        'UPDATE listings SET
            listing_type = ?, title = ?, description = ?,
            media_url = ?, video_url = ?, portfolio_urls_json = ?, soft_skills_json = ?,
            location_country_code = ?, location_country_name = ?, location_us_state = ?,
            moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ?
         WHERE id = ? AND user_id = ?'
    );
    $upd->execute([
        $listingType,
        $title,
        $description,
        $mediaUrl,
        $videoDb,
        $portfolioJson,
        $skillsJson,
        $countryCode,
        $countryName,
        $usStateName,
        $newStatus,
        $adminNote,
        $reviewedAt,
        $reviewedBy,
        $listingId,
        $userId,
    ]);
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (str_contains($msg, 'Unknown column') || str_contains($msg, "doesn't exist")) {
        ww_json([
            'ok' => false,
            'error' => 'Database is missing listing columns. See database/README.md.',
        ], 500);
    }
    throw $e;
}

$msg = $demote
    ? 'Your changes were saved and the listing was sent for review again.'
    : 'Your listing was updated.';

ww_json(['ok' => true, 'message' => $msg, 'moderation_status' => $newStatus]);

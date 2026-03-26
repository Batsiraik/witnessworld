<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/listing_helpers.php';
require_once __DIR__ . '/lib/store_helpers.php';

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
    ww_json(['ok' => false, 'error' => 'Account must be verified to open a store'], 403);
}

$avatar = trim((string) ($user['avatar_url'] ?? ''));
if ($avatar === '') {
    ww_json(['ok' => false, 'error' => 'Upload a profile photo in Profile & settings first'], 422);
}

$userId = (int) $user['id'];
$body = ww_read_json();

$name = trim((string) ($body['name'] ?? ''));
if ($name === '' || mb_strlen($name) > 120) {
    ww_json(['ok' => false, 'error' => 'Store name is required (max 120 characters)'], 422);
}

$description = trim((string) ($body['description'] ?? ''));
if ($description === '' || mb_strlen($description) > 6000) {
    ww_json(['ok' => false, 'error' => 'Description is required (max 6000 characters)'], 422);
}

$sells = trim((string) ($body['sells_summary'] ?? ''));
if ($sells === '' || mb_strlen($sells) > 255) {
    ww_json(['ok' => false, 'error' => 'What you sell is required (short line, max 255 characters)'], 422);
}

$logoUrl = trim((string) ($body['logo_url'] ?? ''));
if ($logoUrl === '' || !ww_store_logo_banner_url_belongs_to_user($logoUrl, $userId)) {
    ww_json(['ok' => false, 'error' => 'Store logo is required — upload in the app'], 422);
}

$bannerUrl = trim((string) ($body['banner_url'] ?? ''));
$bannerDb = null;
if ($bannerUrl !== '') {
    if (!ww_store_logo_banner_url_belongs_to_user($bannerUrl, $userId)) {
        ww_json(['ok' => false, 'error' => 'Invalid banner URL'], 422);
    }
    $bannerDb = $bannerUrl;
}

$deliveryType = strtolower(trim((string) ($body['delivery_type'] ?? '')));
if (!in_array($deliveryType, ww_store_delivery_types(), true)) {
    ww_json(['ok' => false, 'error' => 'Invalid delivery_type'], 422);
}

$deliveryNotes = trim((string) ($body['delivery_notes'] ?? ''));
if (mb_strlen($deliveryNotes) > 500) {
    ww_json(['ok' => false, 'error' => 'Delivery notes must be 500 characters or less'], 422);
}
if ($deliveryType === 'custom' && ($deliveryNotes === '' || mb_strlen($deliveryNotes) < 3)) {
    ww_json(['ok' => false, 'error' => 'Describe your shipping or delivery rules (at least 3 characters) when delivery is custom'], 422);
}
$deliveryNotesDb = $deliveryNotes !== '' ? $deliveryNotes : null;

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

try {
    $ins = $pdo->prepare(
        'INSERT INTO stores (
            user_id, name, description, sells_summary, logo_url, banner_url,
            location_country_code, location_country_name, location_us_state,
            delivery_type, delivery_notes, moderation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $userId,
        $name,
        $description,
        $sells,
        $logoUrl,
        $bannerDb,
        $countryCode,
        $countryName,
        $usStateName,
        $deliveryType,
        $deliveryNotesDb,
        'pending_approval',
    ]);
    $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
    $msg = $e->getMessage();
    if (str_contains($msg, 'Unknown column') || str_contains($msg, "doesn't exist")) {
        ww_json([
            'ok' => false,
            'error' => 'Database is missing store tables. See database/README.md.',
        ], 500);
    }
    throw $e;
}

ww_json([
    'ok' => true,
    'store_id' => $id,
    'moderation_status' => 'pending_approval',
    'message' => 'Your store was submitted for review. You cannot add products until an admin approves it.',
]);

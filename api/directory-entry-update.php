<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/listing_helpers.php';
require_once __DIR__ . '/lib/directory_helpers.php';

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
    ww_json(['ok' => false, 'error' => 'Upload a profile photo first'], 422);
}

$userId = (int) $user['id'];
$body = ww_read_json();

$entryId = (int) ($body['entry_id'] ?? 0);
if ($entryId <= 0) {
    ww_json(['ok' => false, 'error' => 'entry_id required'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM directory_entries WHERE id = ? AND user_id = ? LIMIT 1');
    $st->execute([$entryId, $userId]);
    $existing = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$existing) {
    ww_json(['ok' => false, 'error' => 'Not found'], 404);
}

$mod = (string) ($existing['moderation_status'] ?? '');
if ($mod === 'suspended') {
    ww_json(['ok' => false, 'error' => 'This listing is suspended'], 403);
}

$businessName = trim((string) ($body['business_name'] ?? ''));
if ($businessName === '' || mb_strlen($businessName) > 200) {
    ww_json(['ok' => false, 'error' => 'Business name is required (max 200 characters)'], 422);
}

$tagline = trim((string) ($body['tagline'] ?? ''));
if (mb_strlen($tagline) > 255) {
    ww_json(['ok' => false, 'error' => 'Tagline too long'], 422);
}
$taglineDb = $tagline !== '' ? $tagline : null;

$description = trim((string) ($body['description'] ?? ''));
if (mb_strlen($description) > 8000) {
    ww_json(['ok' => false, 'error' => 'Description too long'], 422);
}
$descDb = $description !== '' ? $description : null;

$category = trim((string) ($body['category'] ?? ''));
if (!ww_directory_category_valid($category)) {
    ww_json(['ok' => false, 'error' => 'Select a valid category'], 422);
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

$addressLine = trim((string) ($body['address_line'] ?? ''));
if (mb_strlen($addressLine) > 255) {
    ww_json(['ok' => false, 'error' => 'Address too long'], 422);
}
$addressDb = $addressLine !== '' ? $addressLine : null;

$city = trim((string) ($body['city'] ?? ''));
if ($city === '' || mb_strlen($city) > 120) {
    ww_json(['ok' => false, 'error' => 'City is required'], 422);
}

$postal = trim((string) ($body['postal_code'] ?? ''));
if (mb_strlen($postal) > 32) {
    ww_json(['ok' => false, 'error' => 'Postal code too long'], 422);
}
$postalDb = $postal !== '' ? $postal : null;

$phone = trim((string) ($body['phone'] ?? ''));
if ($phone === '' || mb_strlen($phone) > 40) {
    ww_json(['ok' => false, 'error' => 'Phone is required'], 422);
}

$email = trim((string) ($body['email'] ?? ''));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ww_json(['ok' => false, 'error' => 'Valid email is required'], 422);
}

$website = trim((string) ($body['website'] ?? ''));
$websiteDb = null;
if ($website !== '' && !ww_directory_http_url_ok($website)) {
    ww_json(['ok' => false, 'error' => 'Website must be a valid http(s) URL'], 422);
}
$websiteDb = $website !== '' ? $website : null;

$mapUrl = trim((string) ($body['map_url'] ?? ''));
$mapDb = null;
if ($mapUrl !== '' && !ww_directory_http_url_ok($mapUrl)) {
    ww_json(['ok' => false, 'error' => 'Map link must be a valid http(s) URL'], 422);
}
$mapDb = $mapUrl !== '' ? $mapUrl : null;

$hours = trim((string) ($body['hours_text'] ?? ''));
if (mb_strlen($hours) > 4000) {
    ww_json(['ok' => false, 'error' => 'Hours text too long'], 422);
}
$hoursDb = $hours !== '' ? $hours : null;

$logoUrl = trim((string) ($body['logo_url'] ?? ''));
$logoDb = null;
if ($logoUrl !== '') {
    if (!ww_directory_logo_url_belongs_to_user($logoUrl, $userId)) {
        ww_json(['ok' => false, 'error' => 'Invalid logo URL'], 422);
    }
    $logoDb = $logoUrl;
} else {
    $existingLogo = trim((string) ($existing['logo_url'] ?? ''));
    if ($existingLogo !== '' && ww_directory_logo_url_belongs_to_user($existingLogo, $userId)) {
        $logoDb = $existingLogo;
    }
}

$demote = in_array($mod, ['approved', 'rejected'], true);
$newStatus = $demote ? 'pending_approval' : $mod;
$adminNote = $demote ? null : ($existing['admin_note'] ?? null);
$reviewedAt = $demote ? null : ($existing['reviewed_at'] ?? null);
$reviewedBy = $demote ? null : ($existing['reviewed_by_admin_id'] ?? null);

try {
    $upd = $pdo->prepare(
        'UPDATE directory_entries SET
            business_name = ?, tagline = ?, description = ?, category = ?,
            location_country_code = ?, location_country_name = ?, location_us_state = ?,
            address_line = ?, city = ?, postal_code = ?,
            phone = ?, email = ?, website = ?, map_url = ?, hours_text = ?, logo_url = ?,
            moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ?
         WHERE id = ? AND user_id = ?'
    );
    $upd->execute([
        $businessName,
        $taglineDb,
        $descDb,
        $category,
        $countryCode,
        $countryName,
        $usStateName,
        $addressDb,
        $city,
        $postalDb,
        $phone,
        $email,
        $websiteDb,
        $mapDb,
        $hoursDb,
        $logoDb,
        $newStatus,
        $adminNote,
        $reviewedAt,
        $reviewedBy,
        $entryId,
        $userId,
    ]);
} catch (Throwable $e) {
    if (str_contains($e->getMessage(), 'Unknown column')) {
        ww_json(['ok' => false, 'error' => 'Directory table missing or out of date. See database/README.md.'], 500);
    }
    throw $e;
}

$msg = $demote ? 'Saved and sent for review again.' : 'Listing updated.';

ww_json(['ok' => true, 'message' => $msg, 'moderation_status' => $newStatus]);

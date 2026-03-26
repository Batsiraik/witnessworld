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
    ww_json(['ok' => false, 'error' => 'City is required (max 120 characters)'], 422);
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
if ($email === '' || mb_strlen($email) > 255 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ww_json(['ok' => false, 'error' => 'Valid public email is required'], 422);
}

$website = trim((string) ($body['website'] ?? ''));
$websiteDb = null;
if ($website !== '') {
    if (!ww_directory_http_url_ok($website)) {
        ww_json(['ok' => false, 'error' => 'Website must be a valid http(s) URL'], 422);
    }
    $websiteDb = $website;
}

$mapUrl = trim((string) ($body['map_url'] ?? ''));
$mapDb = null;
if ($mapUrl !== '') {
    if (!ww_directory_http_url_ok($mapUrl)) {
        ww_json(['ok' => false, 'error' => 'Map link must be a valid http(s) URL'], 422);
    }
    $mapDb = $mapUrl;
}

$hours = trim((string) ($body['hours_text'] ?? ''));
if (mb_strlen($hours) > 4000) {
    ww_json(['ok' => false, 'error' => 'Hours text too long'], 422);
}
$hoursDb = $hours !== '' ? $hours : null;

$logoUrl = trim((string) ($body['logo_url'] ?? ''));
$logoDb = null;
if ($logoUrl !== '') {
    if (!ww_directory_logo_url_belongs_to_user($logoUrl, $userId)) {
        ww_json(['ok' => false, 'error' => 'Invalid logo URL — upload in the app'], 422);
    }
    $logoDb = $logoUrl;
}

try {
    $ins = $pdo->prepare(
        'INSERT INTO directory_entries (
            user_id, business_name, tagline, description, category,
            location_country_code, location_country_name, location_us_state,
            address_line, city, postal_code,
            phone, email, website, map_url, hours_text, logo_url, moderation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $ins->execute([
        $userId,
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
        'pending_approval',
    ]);
    $id = (int) $pdo->lastInsertId();
} catch (Throwable $e) {
    if (str_contains($e->getMessage(), 'Unknown column') || str_contains($e->getMessage(), "doesn't exist")) {
        ww_json(['ok' => false, 'error' => 'Directory table missing. See database/README.md.'], 500);
    }
    throw $e;
}

ww_json([
    'ok' => true,
    'entry_id' => $id,
    'moderation_status' => 'pending_approval',
    'message' => 'Your business listing was submitted for review.',
]);

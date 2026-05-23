<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/api/lib/listing_helpers.php';
require_once dirname(__DIR__, 2) . '/api/lib/store_helpers.php';
require_once dirname(__DIR__, 2) . '/api/lib/directory_helpers.php';

/**
 * @return array<string, mixed>|null
 */
function ww_admin_load_user(PDO $pdo, int $userId): ?array
{
    $st = $pdo->prepare(
        'SELECT id, email, first_name, last_name, username, status FROM users WHERE id = ? LIMIT 1'
    );
    $st->execute([$userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function ww_admin_user_label(array $user): string
{
    $name = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
    if ($name === '') {
        $name = (string) ($user['username'] ?? 'User');
    }
    return $name;
}

/**
 * @return array{ok:bool, id?:int, error?:string, edit_url?:string}
 */
function ww_admin_create_listing(PDO $pdo, int $userId, int $adminId, array $data): array
{
    $user = ww_admin_load_user($pdo, $userId);
    if (!$user) {
        return ['ok' => false, 'error' => 'User not found'];
    }

    $listingType = strtolower(trim((string) ($data['listing_type'] ?? '')));
    if (!in_array($listingType, ['classified', 'service', 'community'], true)) {
        return ['ok' => false, 'error' => 'Invalid listing type'];
    }

    $title = trim((string) ($data['title'] ?? ''));
    $description = trim((string) ($data['description'] ?? ''));
    $mediaUrl = trim((string) ($data['media_url'] ?? ''));
    if ($title === '' || $description === '' || $mediaUrl === '') {
        return ['ok' => false, 'error' => 'Title, description, and main image are required'];
    }
    if (!ww_listing_url_belongs_to_user($mediaUrl, $userId)) {
        return ['ok' => false, 'error' => 'Upload the main image using the form upload button'];
    }

    $countryCode = strtoupper(trim((string) ($data['location_country_code'] ?? '')));
    $countryMap = ww_listing_country_map();
    if ($countryCode === '' || !isset($countryMap[$countryCode])) {
        return ['ok' => false, 'error' => 'Select a valid country'];
    }
    $usStateName = null;
    if ($countryCode === 'US') {
        $stateCode = strtoupper(trim((string) ($data['location_us_state_code'] ?? '')));
        $stateMap = ww_listing_us_state_map();
        if ($stateCode === '' || !isset($stateMap[$stateCode])) {
            return ['ok' => false, 'error' => 'Select a U.S. state'];
        }
        $usStateName = $stateMap[$stateCode];
    }

    $categoryId = isset($data['category_id']) && (int) $data['category_id'] > 0 ? (int) $data['category_id'] : null;
    $isFree = 0;
    $priceAmount = null;
    $pricingType = 'none';
    $currency = 'USD';
    if ($listingType === 'classified') {
        $isFree = !empty($data['is_free']) ? 1 : 0;
        if (!$isFree && isset($data['price_amount']) && is_numeric($data['price_amount'])) {
            $priceAmount = number_format((float) $data['price_amount'], 2, '.', '');
            $pricingType = 'fixed';
        }
        $currIn = strtoupper(trim((string) ($data['currency'] ?? 'USD')));
        if (strlen($currIn) === 3) {
            $currency = $currIn;
        }
    }

    $videoUrl = trim((string) ($data['video_url'] ?? ''));
    if ($videoUrl !== '' && !ww_listing_url_belongs_to_user($videoUrl, $userId)) {
        return ['ok' => false, 'error' => 'Invalid video URL'];
    }

    $portfolio = [];
    foreach (preg_split('/\r\n|\r|\n/', (string) ($data['portfolio_urls'] ?? '')) as $u) {
        $u = trim($u);
        if ($u !== '' && ww_listing_url_belongs_to_user($u, $userId)) {
            $portfolio[] = $u;
        }
    }

    $skills = [];
    foreach (preg_split('/,/', (string) ($data['soft_skills'] ?? '')) as $s) {
        $s = trim($s);
        if ($s !== '') {
            $skills[] = mb_substr($s, 0, 60);
        }
    }

    $now = date('Y-m-d H:i:s');
    $note = trim((string) ($data['admin_note'] ?? ''));
    if ($note === '') {
        $note = 'Created by admin on behalf of member.';
    }

    $pdo->prepare(
        'INSERT INTO listings (
            user_id, listing_type, category_id, title, description,
            price_amount, is_free, pricing_type, currency,
            media_url, video_url, portfolio_urls_json, soft_skills_json,
            location_country_code, location_country_name, location_us_state,
            moderation_status, admin_note, reviewed_at, reviewed_by_admin_id
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    )->execute([
        $userId,
        $listingType,
        $categoryId,
        $title,
        $description,
        $priceAmount,
        $isFree,
        $pricingType,
        $currency,
        $mediaUrl,
        $videoUrl !== '' ? $videoUrl : null,
        $portfolio === [] ? null : json_encode($portfolio, JSON_UNESCAPED_UNICODE),
        $skills === [] ? null : json_encode($skills, JSON_UNESCAPED_UNICODE),
        $countryCode,
        $countryMap[$countryCode],
        $usStateName,
        'approved',
        $note,
        $now,
        $adminId > 0 ? $adminId : null,
    ]);

    $id = (int) $pdo->lastInsertId();
    return ['ok' => true, 'id' => $id, 'edit_url' => 'listing.php?id=' . $id];
}

/**
 * @return array{ok:bool, id?:int, error?:string, edit_url?:string}
 */
function ww_admin_create_store(PDO $pdo, int $userId, int $adminId, array $data): array
{
    $user = ww_admin_load_user($pdo, $userId);
    if (!$user) {
        return ['ok' => false, 'error' => 'User not found'];
    }

    $dup = $pdo->prepare(
        "SELECT id FROM stores WHERE user_id = ? AND moderation_status IN ('pending_approval','approved','suspended') LIMIT 1"
    );
    $dup->execute([$userId]);
    $existingId = (int) ($dup->fetchColumn() ?: 0);
    if ($existingId > 0) {
        return [
            'ok' => false,
            'error' => 'This user already has a store (#' . $existingId . '). Add products from Store products instead.',
        ];
    }

    $name = trim((string) ($data['name'] ?? ''));
    $description = trim((string) ($data['description'] ?? ''));
    $sells = trim((string) ($data['sells_summary'] ?? ''));
    $logoUrl = trim((string) ($data['logo_url'] ?? ''));
    if ($name === '' || $description === '' || $sells === '' || $logoUrl === '') {
        return ['ok' => false, 'error' => 'Store name, description, what you sell, and logo are required'];
    }
    if (!ww_store_logo_banner_url_belongs_to_user($logoUrl, $userId)) {
        return ['ok' => false, 'error' => 'Upload the store logo using the form'];
    }

    $bannerUrl = trim((string) ($data['banner_url'] ?? ''));
    $bannerDb = null;
    if ($bannerUrl !== '' && ww_store_logo_banner_url_belongs_to_user($bannerUrl, $userId)) {
        $bannerDb = $bannerUrl;
    }

    $deliveryType = strtolower(trim((string) ($data['delivery_type'] ?? 'worldwide')));
    if (!in_array($deliveryType, ww_store_delivery_types(), true)) {
        $deliveryType = 'worldwide';
    }

    $countryCode = strtoupper(trim((string) ($data['location_country_code'] ?? '')));
    $countryMap = ww_listing_country_map();
    if ($countryCode === '' || !isset($countryMap[$countryCode])) {
        return ['ok' => false, 'error' => 'Select a valid country'];
    }
    $usStateName = null;
    if ($countryCode === 'US') {
        $stateCode = strtoupper(trim((string) ($data['location_us_state_code'] ?? '')));
        $stateMap = ww_listing_us_state_map();
        if ($stateCode === '' || !isset($stateMap[$stateCode])) {
            return ['ok' => false, 'error' => 'Select a U.S. state'];
        }
        $usStateName = $stateMap[$stateCode];
    }

    $categoryId = isset($data['category_id']) && (int) $data['category_id'] > 0 ? (int) $data['category_id'] : null;
    $now = date('Y-m-d H:i:s');

    $pdo->prepare(
        'INSERT INTO stores (
            user_id, category_id, name, description, sells_summary, logo_url, banner_url,
            location_country_code, location_country_name, location_us_state,
            delivery_type, delivery_notes, moderation_status, reviewed_at, reviewed_by_admin_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $userId,
        $categoryId,
        $name,
        $description,
        $sells,
        $logoUrl,
        $bannerDb,
        $countryCode,
        $countryMap[$countryCode],
        $usStateName,
        $deliveryType,
        trim((string) ($data['delivery_notes'] ?? '')) ?: null,
        'approved',
        $now,
        $adminId > 0 ? $adminId : null,
    ]);

    $id = (int) $pdo->lastInsertId();
    return ['ok' => true, 'id' => $id, 'edit_url' => 'store.php?id=' . $id];
}

/**
 * @return array{ok:bool, id?:int, error?:string, edit_url?:string}
 */
function ww_admin_create_directory(PDO $pdo, int $userId, int $adminId, array $data): array
{
    $user = ww_admin_load_user($pdo, $userId);
    if (!$user) {
        return ['ok' => false, 'error' => 'User not found'];
    }

    $businessName = trim((string) ($data['business_name'] ?? ''));
    $city = trim((string) ($data['city'] ?? ''));
    $phone = trim((string) ($data['phone'] ?? ''));
    $email = trim((string) ($data['email'] ?? ''));
    if ($businessName === '' || $city === '' || $phone === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return ['ok' => false, 'error' => 'Business name, city, phone, and valid email are required'];
    }

    $categoryId = (int) ($data['category_id'] ?? 0);
    $category = '';
    if ($categoryId > 0) {
        $catRow = $pdo->prepare('SELECT slug FROM directory_categories WHERE id = ? AND is_active = 1 LIMIT 1');
        $catRow->execute([$categoryId]);
        $category = (string) ($catRow->fetchColumn() ?: '');
        if ($category === '') {
            return ['ok' => false, 'error' => 'Invalid directory category'];
        }
    } else {
        return ['ok' => false, 'error' => 'Select a directory category'];
    }

    $countryCode = strtoupper(trim((string) ($data['location_country_code'] ?? '')));
    $countryMap = ww_listing_country_map();
    if ($countryCode === '' || !isset($countryMap[$countryCode])) {
        return ['ok' => false, 'error' => 'Select a valid country'];
    }
    $usStateName = null;
    if ($countryCode === 'US') {
        $stateCode = strtoupper(trim((string) ($data['location_us_state_code'] ?? '')));
        $stateMap = ww_listing_us_state_map();
        if ($stateCode === '' || !isset($stateMap[$stateCode])) {
            return ['ok' => false, 'error' => 'Select a U.S. state'];
        }
        $usStateName = $stateMap[$stateCode];
    }

    $logoUrl = trim((string) ($data['logo_url'] ?? ''));
    $logoDb = null;
    if ($logoUrl !== '' && ww_directory_logo_url_belongs_to_user($logoUrl, $userId)) {
        $logoDb = $logoUrl;
    }

    $now = date('Y-m-d H:i:s');

    $pdo->prepare(
        'INSERT INTO directory_entries (
            user_id, business_name, tagline, description, category, category_id,
            location_country_code, location_country_name, location_us_state,
            address_line, city, postal_code,
            phone, email, website, map_url, hours_text, logo_url,
            moderation_status, reviewed_at, reviewed_by_admin_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $userId,
        $businessName,
        trim((string) ($data['tagline'] ?? '')) ?: null,
        trim((string) ($data['description'] ?? '')) ?: null,
        $category,
        $categoryId,
        $countryCode,
        $countryMap[$countryCode],
        $usStateName,
        trim((string) ($data['address_line'] ?? '')) ?: null,
        $city,
        trim((string) ($data['postal_code'] ?? '')) ?: null,
        $phone,
        $email,
        trim((string) ($data['website'] ?? '')) ?: null,
        trim((string) ($data['map_url'] ?? '')) ?: null,
        trim((string) ($data['hours_text'] ?? '')) ?: null,
        $logoDb,
        'approved',
        $now,
        $adminId > 0 ? $adminId : null,
    ]);

    $id = (int) $pdo->lastInsertId();
    return ['ok' => true, 'id' => $id, 'edit_url' => 'directory_entry.php?id=' . $id];
}

/**
 * @return array{ok:bool, id?:int, error?:string, edit_url?:string}
 */
function ww_admin_create_product(PDO $pdo, int $storeId, int $adminId, array $data): array
{
    $st = $pdo->prepare('SELECT id, user_id, name FROM stores WHERE id = ? LIMIT 1');
    $st->execute([$storeId]);
    $store = $st->fetch(PDO::FETCH_ASSOC);
    if (!$store) {
        return ['ok' => false, 'error' => 'Store not found'];
    }

    $name = trim((string) ($data['name'] ?? ''));
    $imageUrl = trim((string) ($data['image_url'] ?? ''));
    if ($name === '' || $imageUrl === '') {
        return ['ok' => false, 'error' => 'Product name and photo are required'];
    }
    if (!ww_store_product_image_url_belongs_to_store($imageUrl, $storeId)) {
        return ['ok' => false, 'error' => 'Upload the product photo using the form'];
    }

    if (!is_numeric($data['price_amount'] ?? '')) {
        return ['ok' => false, 'error' => 'Valid price is required'];
    }
    $priceStr = number_format((float) $data['price_amount'], 2, '.', '');
    $currency = strtoupper(trim((string) ($data['currency'] ?? 'USD')));
    if (!preg_match('/^[A-Z]{3}$/', $currency)) {
        $currency = 'USD';
    }

    $now = date('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO store_products (
            store_id, name, description, specifications, price_amount, currency, image_url,
            moderation_status, reviewed_at, reviewed_by_admin_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )->execute([
        $storeId,
        $name,
        trim((string) ($data['description'] ?? '')) ?: null,
        trim((string) ($data['specifications'] ?? '')) ?: null,
        $priceStr,
        $currency,
        $imageUrl,
        'approved',
        $now,
        $adminId > 0 ? $adminId : null,
    ]);

    $id = (int) $pdo->lastInsertId();
    return ['ok' => true, 'id' => $id, 'edit_url' => 'store_product.php?id=' . $id];
}

/**
 * @param array<string, mixed> $file $_FILES entry
 * @return array{ok:bool, url?:string, error?:string}
 */
function ww_admin_handle_upload(array $file, string $destDir, string $publicPath, int $maxBytes, bool $imagesOnly = true): array
{
    if (empty($file['tmp_name']) || !is_uploaded_file((string) $file['tmp_name'])) {
        return ['ok' => false, 'error' => 'No file uploaded'];
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
        return ['ok' => false, 'error' => 'Upload failed'];
    }
    $size = (int) ($file['size'] ?? 0);
    if ($size <= 0 || $size > $maxBytes) {
        return ['ok' => false, 'error' => 'File too large'];
    }
    $tmp = (string) $file['tmp_name'];
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mime = is_object($finfo) ? (string) $finfo->file($tmp) : '';
    $map = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!$imagesOnly) {
        $map['video/mp4'] = 'mp4';
        $map['video/quicktime'] = 'mov';
    }
    if (!isset($map[$mime])) {
        return ['ok' => false, 'error' => 'Invalid file type'];
    }
    if (!is_dir($destDir) && !mkdir($destDir, 0755, true) && !is_dir($destDir)) {
        return ['ok' => false, 'error' => 'Could not create upload folder'];
    }
    $name = 'admin_' . bin2hex(random_bytes(8)) . '.' . $map[$mime];
    if (!move_uploaded_file($tmp, $destDir . '/' . $name)) {
        return ['ok' => false, 'error' => 'Could not save file'];
    }
    $base = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');
    if ($base === '' && !empty($_SERVER['HTTP_HOST'])) {
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $base = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/witnessworld';
    }
    return ['ok' => true, 'url' => $base . $publicPath . '/' . $name];
}

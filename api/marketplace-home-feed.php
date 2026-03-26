<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/directory_helpers.php';

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

$section = strtolower(trim((string) ($_GET['section'] ?? 'all')));
if (!in_array($section, ['all', 'services', 'classifieds', 'products', 'stores', 'directory'], true)) {
    $section = 'all';
}

$limit = (int) ($_GET['limit'] ?? 10);
if ($limit < 1) {
    $limit = 10;
}
if ($limit > 24) {
    $limit = 24;
}

$need = static function (string $key) use ($section): bool {
    if ($section === 'all') {
        return true;
    }
    return $section === $key;
};

$out = [
    'services' => [],
    'classifieds' => [],
    'products' => [],
    'stores' => [],
    'directory' => [],
];

try {
    if ($need('services')) {
        $st = $pdo->prepare(
            'SELECT l.id, l.title, l.description, l.price_amount, l.pricing_type, l.currency, l.media_url,
                    l.location_country_name, l.location_us_state, l.created_at,
                    u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
             FROM listings l
             INNER JOIN users u ON u.id = l.user_id
             WHERE l.moderation_status = ? AND l.listing_type = ?
             ORDER BY l.id DESC
             LIMIT ' . (int) $limit
        );
        $st->execute(['approved', 'service']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out['services'][] = ww_feed_row_listing($r);
        }
    }

    if ($need('classifieds')) {
        $st = $pdo->prepare(
            'SELECT l.id, l.title, l.description, l.price_amount, l.pricing_type, l.currency, l.media_url,
                    l.location_country_name, l.location_us_state, l.created_at,
                    u.id AS seller_user_id, u.username, u.first_name, u.last_name, u.avatar_url
             FROM listings l
             INNER JOIN users u ON u.id = l.user_id
             WHERE l.moderation_status = ? AND l.listing_type = ?
             ORDER BY l.id DESC
             LIMIT ' . (int) $limit
        );
        $st->execute(['approved', 'classified']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out['classifieds'][] = ww_feed_row_listing($r);
        }
    }

    if ($need('products')) {
        $st = $pdo->prepare(
            'SELECT p.id, p.store_id, p.name, p.price_amount, p.currency, p.image_url, p.created_at,
                    s.name AS store_name, s.logo_url AS store_logo_url, s.user_id AS seller_user_id,
                    s.location_country_name, s.location_us_state,
                    u.username, u.first_name, u.last_name, u.avatar_url
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             INNER JOIN users u ON u.id = s.user_id
             WHERE p.moderation_status = ? AND s.moderation_status = ?
             ORDER BY p.id DESC
             LIMIT ' . (int) $limit
        );
        $st->execute(['approved', 'approved']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out['products'][] = [
                'id' => (int) $r['id'],
                'store_id' => (int) $r['store_id'],
                'name' => (string) $r['name'],
                'price_amount' => (string) $r['price_amount'],
                'currency' => (string) $r['currency'],
                'image_url' => $r['image_url'] ? (string) $r['image_url'] : null,
                'created_at' => (string) $r['created_at'],
                'store_name' => (string) $r['store_name'],
                'store_logo_url' => (string) $r['store_logo_url'],
                'location_country_name' => (string) $r['location_country_name'],
                'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
                'seller_user_id' => (int) $r['seller_user_id'],
                'seller_username' => (string) $r['username'],
                'seller_label' => trim((string) $r['first_name'] . ' ' . (string) $r['last_name']),
                'seller_avatar_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
            ];
        }
    }

    if ($need('stores')) {
        $st = $pdo->prepare(
            'SELECT s.id, s.name, s.sells_summary, s.logo_url, s.banner_url, s.location_country_name,
                    s.location_us_state, s.delivery_type, s.created_at, s.user_id AS seller_user_id,
                    u.username, u.first_name, u.last_name, u.avatar_url
             FROM stores s
             INNER JOIN users u ON u.id = s.user_id
             WHERE s.moderation_status = ?
             ORDER BY s.id DESC
             LIMIT ' . (int) $limit
        );
        $st->execute(['approved']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out['stores'][] = [
                'id' => (int) $r['id'],
                'name' => (string) $r['name'],
                'sells_summary' => (string) $r['sells_summary'],
                'logo_url' => (string) $r['logo_url'],
                'banner_url' => $r['banner_url'] ? (string) $r['banner_url'] : null,
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
    }

    if ($need('directory')) {
        $st = $pdo->prepare(
            'SELECT d.id, d.business_name, d.tagline, d.category, d.city, d.location_us_state, d.location_country_name,
                    d.logo_url, d.created_at
             FROM directory_entries d
             WHERE d.moderation_status = ?
             ORDER BY d.id DESC
             LIMIT ' . (int) $limit
        );
        $st->execute(['approved']);
        $cats = ww_directory_categories();
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $slug = (string) $r['category'];
            $out['directory'][] = [
                'id' => (int) $r['id'],
                'business_name' => (string) $r['business_name'],
                'tagline' => $r['tagline'] ? (string) $r['tagline'] : null,
                'category' => $slug,
                'category_label' => $cats[$slug] ?? $slug,
                'city' => (string) $r['city'],
                'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
                'location_country_name' => (string) $r['location_country_name'],
                'logo_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
                'created_at' => (string) $r['created_at'],
            ];
        }
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Feed unavailable'], 500);
}

ww_json(['ok' => true, 'section' => $section, 'limit' => $limit, 'feed' => $out]);

/**
 * @param array<string, mixed> $r
 * @return array<string, mixed>
 */
function ww_feed_row_listing(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'title' => (string) $r['title'],
        'description' => (string) $r['description'],
        'price_amount' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
        'pricing_type' => (string) $r['pricing_type'],
        'currency' => (string) $r['currency'],
        'media_url' => $r['media_url'] ? (string) $r['media_url'] : null,
        'location_country_name' => $r['location_country_name'] ? (string) $r['location_country_name'] : null,
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'created_at' => (string) $r['created_at'],
        'seller_user_id' => (int) $r['seller_user_id'],
        'seller_username' => (string) $r['username'],
        'seller_label' => trim((string) $r['first_name'] . ' ' . (string) $r['last_name']),
        'seller_avatar_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
    ];
}

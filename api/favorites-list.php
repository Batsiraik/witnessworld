<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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

$limit = (int) ($_GET['limit'] ?? 80);
if ($limit < 1) {
    $limit = 80;
}
if ($limit > 120) {
    $limit = 120;
}

$st = $pdo->prepare(
    'SELECT subject_type, subject_id, created_at
     FROM user_favorites
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ' . (int) $limit
);
$st->execute([(int) $user['id']]);
$favorites = $st->fetchAll(PDO::FETCH_ASSOC);

$out = [];

foreach ($favorites as $fav) {
    $type = (string) $fav['subject_type'];
    $id = (int) $fav['subject_id'];
    $savedAt = (string) $fav['created_at'];

    if ($type === 'listing') {
        $q = $pdo->prepare(
            'SELECT id, title, listing_type, price_amount, is_free, currency, media_url,
                    location_country_name, location_us_state
             FROM listings
             WHERE id = ? AND moderation_status = ?
             LIMIT 1'
        );
        $q->execute([$id, 'approved']);
        $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            continue;
        }
        $price = (int) ($r['is_free'] ?? 0) === 1 ? 'FREE' : ($r['price_amount'] ? (string) $r['currency'] . ' ' . (string) $r['price_amount'] : null);
        $out[] = [
            'subject_type' => 'listing',
            'subject_id' => (int) $r['id'],
            'title' => (string) $r['title'],
            'subtitle' => ucfirst((string) $r['listing_type']),
            'meta' => trim(implode(', ', array_filter([(string) ($r['location_us_state'] ?? ''), (string) ($r['location_country_name'] ?? '')]))),
            'price' => $price,
            'image_url' => $r['media_url'] ? (string) $r['media_url'] : null,
            'created_at' => $savedAt,
        ];
    } elseif ($type === 'product') {
        $q = $pdo->prepare(
            'SELECT p.id, p.name, p.price_amount, p.currency, p.image_url, s.name AS store_name,
                    s.location_country_name, s.location_us_state
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
             LIMIT 1'
        );
        $q->execute([$id, 'approved', 'approved']);
        $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            continue;
        }
        $out[] = [
            'subject_type' => 'product',
            'subject_id' => (int) $r['id'],
            'title' => (string) $r['name'],
            'subtitle' => (string) $r['store_name'],
            'meta' => trim(implode(', ', array_filter([(string) ($r['location_us_state'] ?? ''), (string) ($r['location_country_name'] ?? '')]))),
            'price' => (string) $r['currency'] . ' ' . (string) $r['price_amount'],
            'image_url' => $r['image_url'] ? (string) $r['image_url'] : null,
            'created_at' => $savedAt,
        ];
    } elseif ($type === 'store') {
        $q = $pdo->prepare(
            'SELECT id, name, sells_summary, logo_url, location_country_name, location_us_state
             FROM stores
             WHERE id = ? AND moderation_status = ?
             LIMIT 1'
        );
        $q->execute([$id, 'approved']);
        $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            continue;
        }
        $out[] = [
            'subject_type' => 'store',
            'subject_id' => (int) $r['id'],
            'title' => (string) $r['name'],
            'subtitle' => (string) $r['sells_summary'],
            'meta' => trim(implode(', ', array_filter([(string) ($r['location_us_state'] ?? ''), (string) ($r['location_country_name'] ?? '')]))),
            'price' => null,
            'image_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
            'created_at' => $savedAt,
        ];
    } elseif ($type === 'directory_entry') {
        $q = $pdo->prepare(
            'SELECT id, business_name, tagline, city, location_us_state, location_country_name, logo_url
             FROM directory_entries
             WHERE id = ? AND moderation_status = ?
             LIMIT 1'
        );
        $q->execute([$id, 'approved']);
        $r = $q->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            continue;
        }
        $out[] = [
            'subject_type' => 'directory_entry',
            'subject_id' => (int) $r['id'],
            'title' => (string) $r['business_name'],
            'subtitle' => $r['tagline'] ? (string) $r['tagline'] : 'Business directory',
            'meta' => trim(implode(', ', array_filter([(string) ($r['city'] ?? ''), (string) ($r['location_us_state'] ?? ''), (string) ($r['location_country_name'] ?? '')]))),
            'price' => null,
            'image_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
            'created_at' => $savedAt,
        ];
    }
}

ww_json(['ok' => true, 'favorites' => $out]);

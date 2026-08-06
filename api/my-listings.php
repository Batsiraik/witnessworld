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

$userId = (int) $user['id'];

/**
 * Best thumbnail for office cards: main media, else first portfolio image.
 *
 * @param array<string, mixed> $r
 */
$listingDisplayImage = static function (array $r): ?string {
    $m = $r['media_url'] ?? null;
    if (is_string($m) && trim($m) !== '') {
        return trim($m);
    }
    $raw = $r['portfolio_urls_json'] ?? '';
    if ($raw === '' || $raw === null) {
        return null;
    }
    $dec = json_decode((string) $raw, true);
    if (!is_array($dec)) {
        return null;
    }
    foreach ($dec as $u) {
        if (is_string($u) && trim($u) !== '') {
            return trim($u);
        }
    }
    return null;
};

try {
    // Aggregate views only for this user's listings (not the whole content_views table).
    $st = $pdo->prepare(
        'SELECT l.id, l.listing_type, l.title, l.moderation_status, l.media_url, l.video_url, l.portfolio_urls_json,
                l.price_amount, l.pricing_type, l.currency,
                l.location_country_code, l.location_country_name, l.location_us_state,
                l.created_at, l.updated_at,
                COALESCE(vc.views_total, 0) AS views_total,
                COALESCE(vc.views_7d, 0) AS views_7d
         FROM listings l
         LEFT JOIN (
           SELECT cv.subject_id,
                  COUNT(*) AS views_total,
                  SUM(CASE WHEN cv.view_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS views_7d
           FROM content_views cv
           INNER JOIN listings lu ON lu.id = cv.subject_id AND lu.user_id = ?
           WHERE cv.subject_type = \'listing\'
           GROUP BY cv.subject_id
         ) vc ON vc.subject_id = l.id
         WHERE l.user_id = ?
         ORDER BY l.id DESC
         LIMIT 200'
    );
    $st->execute([$userId, $userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    // Fallback if analytics tables are not migrated yet.
    try {
        $st = $pdo->prepare(
            'SELECT id, listing_type, title, moderation_status, media_url, video_url, portfolio_urls_json,
                    price_amount, pricing_type, currency,
                    location_country_code, location_country_name, location_us_state,
                    created_at, updated_at
             FROM listings
             WHERE user_id = ?
             ORDER BY id DESC'
        );
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable) {
        ww_json(['ok' => false, 'error' => 'Listings unavailable'], 500);
    }
}

$list = [];
foreach ($rows as $r) {
    $vid = $r['video_url'] ?? null;
    $hasVideo = is_string($vid) && trim($vid) !== '';
    $list[] = [
        'id' => (int) $r['id'],
        'listing_type' => (string) $r['listing_type'],
        'title' => (string) $r['title'],
        'moderation_status' => (string) $r['moderation_status'],
        'media_url' => $r['media_url'] ? (string) $r['media_url'] : null,
        'video_url' => $hasVideo ? trim((string) $vid) : null,
        'display_image_url' => $listingDisplayImage($r),
        'has_video' => $hasVideo,
        'price_amount' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
        'pricing_type' => (string) ($r['pricing_type'] ?? 'fixed'),
        'currency' => (string) ($r['currency'] ?? 'USD'),
        'location_country_code' => $r['location_country_code'] ? (string) $r['location_country_code'] : null,
        'location_country_name' => $r['location_country_name'] ? (string) $r['location_country_name'] : null,
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
        'views_total' => (int) ($r['views_total'] ?? 0),
        'views_7d' => (int) ($r['views_7d'] ?? 0),
    ];
}

ww_json(['ok' => true, 'listings' => $list]);

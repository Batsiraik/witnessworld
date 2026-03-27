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
    $st = $pdo->prepare(
        'SELECT id, listing_type, title, moderation_status, media_url, video_url, portfolio_urls_json,
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
        'location_country_code' => $r['location_country_code'] ? (string) $r['location_country_code'] : null,
        'location_country_name' => $r['location_country_name'] ? (string) $r['location_country_name'] : null,
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
    ];
}

ww_json(['ok' => true, 'listings' => $list]);

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

$userId = (int) $user['id'];
$cats = ww_directory_categories();

try {
    $st = $pdo->prepare(
        'SELECT d.id, d.business_name, d.tagline, d.category, d.city, d.location_country_name, d.location_us_state,
                d.logo_url, d.moderation_status, d.created_at, d.updated_at,
                COALESCE(vc.views_total, 0) AS views_total,
                COALESCE(vc.views_7d, 0) AS views_7d
         FROM directory_entries d
         LEFT JOIN (
           SELECT subject_id,
                  COUNT(*) AS views_total,
                  SUM(CASE WHEN view_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS views_7d
           FROM content_views
           WHERE subject_type = \'directory_entry\'
           GROUP BY subject_id
         ) vc ON vc.subject_id = d.id
         WHERE d.user_id = ?
         ORDER BY d.id DESC'
    );
    $st->execute([$userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    try {
        $st = $pdo->prepare(
            'SELECT id, business_name, tagline, category, city, location_country_name, location_us_state,
                    logo_url, moderation_status, created_at, updated_at
             FROM directory_entries
             WHERE user_id = ?
             ORDER BY id DESC'
        );
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable) {
        ww_json(['ok' => false, 'error' => 'Could not load directory entries'], 500);
    }
}

$list = [];
foreach ($rows as $r) {
    $slug = (string) $r['category'];
    $list[] = [
        'id' => (int) $r['id'],
        'business_name' => (string) $r['business_name'],
        'tagline' => $r['tagline'] ? (string) $r['tagline'] : null,
        'category' => $slug,
        'category_label' => $cats[$slug] ?? $slug,
        'city' => (string) $r['city'],
        'location_country_name' => (string) $r['location_country_name'],
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'logo_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
        'moderation_status' => (string) $r['moderation_status'],
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
        'views_total' => (int) ($r['views_total'] ?? 0),
        'views_7d' => (int) ($r['views_7d'] ?? 0),
    ];
}

ww_json(['ok' => true, 'entries' => $list]);

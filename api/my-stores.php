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

try {
    $st = $pdo->prepare(
        'SELECT s.id, s.name, s.description, s.sells_summary, s.logo_url, s.banner_url,
                s.location_country_code, s.location_country_name, s.location_us_state,
                s.delivery_type, s.delivery_notes, s.moderation_status, s.admin_note,
                s.created_at, s.updated_at,
                COALESCE(vc.views_total, 0) AS views_total,
                COALESCE(vc.views_7d, 0) AS views_7d
         FROM stores s
         LEFT JOIN (
           SELECT subject_id,
                  COUNT(*) AS views_total,
                  SUM(CASE WHEN view_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS views_7d
           FROM content_views
           WHERE subject_type = \'store\'
           GROUP BY subject_id
         ) vc ON vc.subject_id = s.id
         WHERE s.user_id = ?
         ORDER BY s.id DESC'
    );
    $st->execute([$userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    try {
        $st = $pdo->prepare(
            'SELECT id, name, description, sells_summary, logo_url, banner_url,
                    location_country_code, location_country_name, location_us_state,
                    delivery_type, delivery_notes, moderation_status, admin_note,
                    created_at, updated_at
             FROM stores
             WHERE user_id = ?
             ORDER BY id DESC'
        );
        $st->execute([$userId]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable) {
        ww_json(['ok' => false, 'error' => 'Stores unavailable'], 500);
    }
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id' => (int) $r['id'],
        'name' => (string) $r['name'],
        'description' => (string) $r['description'],
        'sells_summary' => (string) $r['sells_summary'],
        'logo_url' => (string) $r['logo_url'],
        'banner_url' => $r['banner_url'] ? (string) $r['banner_url'] : null,
        'location_country_code' => (string) $r['location_country_code'],
        'location_country_name' => (string) $r['location_country_name'],
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'delivery_type' => (string) $r['delivery_type'],
        'delivery_notes' => $r['delivery_notes'] ? (string) $r['delivery_notes'] : null,
        'moderation_status' => (string) $r['moderation_status'],
        'admin_note' => $r['admin_note'] ? (string) $r['admin_note'] : null,
        'created_at' => (string) $r['created_at'],
        'updated_at' => (string) $r['updated_at'],
        'views_total' => (int) ($r['views_total'] ?? 0),
        'views_7d' => (int) ($r['views_7d'] ?? 0),
    ];
}

ww_json(['ok' => true, 'stores' => $list]);

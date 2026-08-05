<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/analytics.php';

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
$since7 = (new DateTimeImmutable('today'))->modify('-6 days')->format('Y-m-d');

$profileTotal = 0;
$profile7d = 0;
try {
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM content_views WHERE subject_type = ? AND subject_id = ?'
    );
    $st->execute(['member', $userId]);
    $profileTotal = (int) $st->fetchColumn();

    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM content_views
         WHERE subject_type = ? AND subject_id = ? AND view_date >= ?'
    );
    $st->execute(['member', $userId, $since7]);
    $profile7d = (int) $st->fetchColumn();
} catch (Throwable) {
    // Tables may not be migrated yet.
}

$contentOwned = 0;
$contentOwned7d = 0;
try {
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM content_views
         WHERE owner_user_id = ? AND subject_type <> ?'
    );
    $st->execute([$userId, 'member']);
    $contentOwned = (int) $st->fetchColumn();

    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM content_views
         WHERE owner_user_id = ? AND subject_type <> ? AND view_date >= ?'
    );
    $st->execute([$userId, 'member', $since7]);
    $contentOwned7d = (int) $st->fetchColumn();
} catch (Throwable) {
}

ww_json([
    'ok' => true,
    'profile_views' => $profileTotal,
    'profile_views_7d' => $profile7d,
    'content_views' => $contentOwned,
    'content_views_7d' => $contentOwned7d,
]);

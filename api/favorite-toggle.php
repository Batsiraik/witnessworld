<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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

$body = ww_read_json();
$userId = (int) $user['id'];
$subjectType = strtolower(trim((string) ($body['subject_type'] ?? '')));
$subjectId = (int) ($body['subject_id'] ?? 0);
$favorite = array_key_exists('favorite', $body) ? (bool) $body['favorite'] : null;

if (!in_array($subjectType, ['listing', 'store', 'product', 'directory_entry'], true) || $subjectId <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid favorite target'], 422);
}

function ww_favorite_target_exists(PDO $pdo, string $subjectType, int $subjectId): bool
{
    if ($subjectType === 'listing') {
        $st = $pdo->prepare('SELECT id FROM listings WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        return (bool) $st->fetchColumn();
    }
    if ($subjectType === 'store') {
        $st = $pdo->prepare('SELECT id FROM stores WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        return (bool) $st->fetchColumn();
    }
    if ($subjectType === 'product') {
        $st = $pdo->prepare(
            'SELECT p.id FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved', 'approved']);
        return (bool) $st->fetchColumn();
    }
    if ($subjectType === 'directory_entry') {
        $st = $pdo->prepare('SELECT id FROM directory_entries WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        return (bool) $st->fetchColumn();
    }

    return false;
}

if (!ww_favorite_target_exists($pdo, $subjectType, $subjectId)) {
    ww_json(['ok' => false, 'error' => 'This item is not available to save'], 404);
}

$existing = $pdo->prepare('SELECT id FROM user_favorites WHERE user_id = ? AND subject_type = ? AND subject_id = ? LIMIT 1');
$existing->execute([$userId, $subjectType, $subjectId]);
$has = (bool) $existing->fetchColumn();
$next = $favorite ?? !$has;

if ($next) {
    $ins = $pdo->prepare(
        'INSERT IGNORE INTO user_favorites (user_id, subject_type, subject_id) VALUES (?, ?, ?)'
    );
    $ins->execute([$userId, $subjectType, $subjectId]);
} else {
    $del = $pdo->prepare('DELETE FROM user_favorites WHERE user_id = ? AND subject_type = ? AND subject_id = ?');
    $del->execute([$userId, $subjectType, $subjectId]);
}

ww_json(['ok' => true, 'favorited' => $next]);

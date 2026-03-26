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

if (($user['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$body = ww_read_json();
$subjectType = strtolower(trim((string) ($body['subject_type'] ?? '')));
if (!in_array($subjectType, ['listing', 'store', 'product', 'directory_entry'], true)) {
    ww_json(['ok' => false, 'error' => 'Invalid subject_type'], 422);
}

$subjectId = (int) ($body['subject_id'] ?? 0);
if ($subjectId <= 0) {
    ww_json(['ok' => false, 'error' => 'subject_id required'], 422);
}

$reason = trim((string) ($body['reason'] ?? ''));
if ($reason === '' || mb_strlen($reason) > 4000) {
    ww_json(['ok' => false, 'error' => 'Reason is required (max 4000 characters)'], 422);
}

$userId = (int) $user['id'];

$visible = false;
try {
    if ($subjectType === 'listing') {
        $st = $pdo->prepare('SELECT id FROM listings WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $visible = (bool) $st->fetchColumn();
    } elseif ($subjectType === 'store') {
        $st = $pdo->prepare('SELECT id FROM stores WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $visible = (bool) $st->fetchColumn();
    } elseif ($subjectType === 'product') {
        $st = $pdo->prepare(
            'SELECT p.id FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved', 'approved']);
        $visible = (bool) $st->fetchColumn();
    } else {
        $st = $pdo->prepare('SELECT id FROM directory_entries WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $visible = (bool) $st->fetchColumn();
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$visible) {
    ww_json(['ok' => false, 'error' => 'Content not found'], 404);
}

try {
    $ins = $pdo->prepare(
        'INSERT INTO content_reports (reporter_user_id, subject_type, subject_id, reason) VALUES (?,?,?,?)'
    );
    $ins->execute([$userId, $subjectType, $subjectId, $reason]);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not submit report. See database/README.md (content_reports).'], 500);
}

ww_json(['ok' => true]);

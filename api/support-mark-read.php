<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/support_helpers.php';

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
$conversationId = (int) ($body['conversation_id'] ?? 0);
$userId = (int) $user['id'];

if ($conversationId <= 0) {
    ww_json(['ok' => false, 'error' => 'conversation_id required'], 422);
}

$suid = ww_support_user_id($pdo);
if ($suid <= 0) {
    ww_json(['ok' => false, 'error' => 'Tech support is not configured'], 503);
}

try {
    $st = $pdo->prepare(
        'SELECT id, context_key, user_low_id, user_high_id FROM conversations WHERE id = ? LIMIT 1'
    );
    $st->execute([$conversationId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || !ww_is_support_context($row)) {
        ww_json(['ok' => false, 'error' => 'Conversation not found'], 404);
    }
    $low = (int) $row['user_low_id'];
    $high = (int) $row['user_high_id'];
    if ($userId !== $low && $userId !== $high) {
        ww_json(['ok' => false, 'error' => 'Conversation not found'], 404);
    }
    if ($userId === $suid) {
        ww_json(['ok' => false, 'error' => 'Forbidden'], 403);
    }
    $pdo->prepare(
        'UPDATE conversations SET member_last_read_at = CURRENT_TIMESTAMP WHERE id = ?'
    )->execute([$conversationId]);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not update read state'], 500);
}

ww_json(['ok' => true]);

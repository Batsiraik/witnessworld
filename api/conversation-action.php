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

$in = ww_read_json();
$conversationId = (int) ($in['conversation_id'] ?? 0);
$action = (string) ($in['action'] ?? '');
if ($conversationId <= 0 || !in_array($action, ['archive', 'delete'], true)) {
    ww_json(['ok' => false, 'error' => 'Invalid conversation action'], 422);
}

$userId = (int) $user['id'];

try {
    $st = $pdo->prepare(
        'SELECT id, user_low_id, user_high_id, context_key
         FROM conversations
         WHERE id = ? AND (user_low_id = ? OR user_high_id = ?)
         LIMIT 1'
    );
    $st->execute([$conversationId, $userId, $userId]);
    $conv = $st->fetch(PDO::FETCH_ASSOC);
    if (!$conv) {
        ww_json(['ok' => false, 'error' => 'Conversation not found'], 404);
    }
    $isSupport = ww_is_support_context($conv);
    if (($user['status'] ?? '') !== 'verified' && !$isSupport) {
        ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
    }

    $prefix = ((int) $conv['user_low_id'] === $userId) ? 'user_low' : 'user_high';
    $col = $action === 'archive' ? "{$prefix}_archived_at" : "{$prefix}_deleted_at";
    $pdo->prepare("UPDATE conversations SET {$col} = CURRENT_TIMESTAMP WHERE id = ?")->execute([$conversationId]);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not update conversation'], 500);
}

ww_json(['ok' => true]);

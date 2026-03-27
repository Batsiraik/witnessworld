<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/conversation_helpers.php';
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

$suid = ww_support_user_id($pdo);
if ($suid <= 0) {
    ww_json(['ok' => false, 'error' => 'Customer Support is not configured'], 503);
}

$userId = (int) $user['id'];
if ($userId === $suid) {
    ww_json(['ok' => false, 'error' => 'Invalid account'], 422);
}

try {
    $st = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $st->execute([$suid]);
    if (!$st->fetchColumn()) {
        ww_json(['ok' => false, 'error' => 'Customer Support account missing'], 503);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

try {
    [$low, $high] = ww_conv_ordered_pair($userId, $suid);
    $contextKey = 'support';
    $ins = $pdo->prepare(
        'INSERT INTO conversations (user_low_id, user_high_id, context_key) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), updated_at = CURRENT_TIMESTAMP'
    );
    $ins->execute([$low, $high, $contextKey]);
    $cid = (int) $pdo->lastInsertId();
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not open Customer Support conversation'], 500);
}

ww_json(['ok' => true, 'conversation_id' => $cid]);

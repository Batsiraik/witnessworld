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
$logId = (int) ($body['admin_push_log_id'] ?? 0);
if ($logId <= 0) {
    ww_json(['ok' => false, 'error' => 'admin_push_log_id required'], 422);
}

$userId = (int) $user['id'];

try {
    $st = $pdo->prepare(
        'SELECT id, audience, target_user_id FROM admin_push_logs WHERE id = ? LIMIT 1'
    );
    $st->execute([$logId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        ww_json(['ok' => false, 'error' => 'Not found'], 404);
    }
    $audience = (string) $row['audience'];
    $target = $row['target_user_id'] !== null ? (int) $row['target_user_id'] : null;
    if ($audience === 'user' && $target !== null && $target !== $userId) {
        ww_json(['ok' => false, 'error' => 'Forbidden'], 403);
    }

    $ins = $pdo->prepare(
        'INSERT IGNORE INTO admin_push_opens (log_id, user_id) VALUES (?,?)'
    );
    $ins->execute([$logId, $userId]);
    if ($ins->rowCount() > 0) {
        $pdo->prepare(
            'UPDATE admin_push_logs SET opens_count = opens_count + 1 WHERE id = ?'
        )->execute([$logId]);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not record open'], 500);
}

ww_json(['ok' => true]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/conversation_helpers.php';

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
$peerId = (int) ($body['peer_user_id'] ?? 0);
$userId = (int) $user['id'];

if ($peerId <= 0) {
    ww_json(['ok' => false, 'error' => 'peer_user_id required'], 422);
}
if ($peerId === $userId) {
    ww_json(['ok' => false, 'error' => 'Cannot message yourself'], 422);
}

try {
    $st = $pdo->prepare('SELECT id, status FROM users WHERE id = ? LIMIT 1');
    $st->execute([$peerId]);
    $peer = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

if (!$peer || ($peer['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'User not available'], 404);
}

$ctxType = strtolower(trim((string) ($body['context_type'] ?? 'general')));
$ctxId = (int) ($body['context_id'] ?? 0);

$contextKey = 'general';
if ($ctxType !== '' && $ctxType !== 'general') {
    try {
        $contextKey = ww_conv_context_key($ctxType, $ctxId);
    } catch (InvalidArgumentException) {
        ww_json(['ok' => false, 'error' => 'Invalid context'], 422);
    }

    $ok = false;
    try {
        if ($ctxType === 'listing') {
            $st = $pdo->prepare('SELECT user_id FROM listings WHERE id = ? AND moderation_status = ? LIMIT 1');
            $st->execute([$ctxId, 'approved']);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            $ok = $row && (int) $row['user_id'] === $peerId;
        } elseif ($ctxType === 'store') {
            $st = $pdo->prepare('SELECT user_id FROM stores WHERE id = ? AND moderation_status = ? LIMIT 1');
            $st->execute([$ctxId, 'approved']);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            $ok = $row && (int) $row['user_id'] === $peerId;
        } elseif ($ctxType === 'product') {
            $st = $pdo->prepare(
                'SELECT s.user_id FROM store_products p
                 INNER JOIN stores s ON s.id = p.store_id
                 WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
                 LIMIT 1'
            );
            $st->execute([$ctxId, 'approved', 'approved']);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            $ok = $row && (int) $row['user_id'] === $peerId;
        } elseif ($ctxType === 'directory_entry') {
            $st = $pdo->prepare('SELECT user_id FROM directory_entries WHERE id = ? AND moderation_status = ? LIMIT 1');
            $st->execute([$ctxId, 'approved']);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            $ok = $row && (int) $row['user_id'] === $peerId;
        }
    } catch (Throwable) {
        ww_json(['ok' => false, 'error' => 'Database error'], 500);
    }
    if (!$ok) {
        ww_json(['ok' => false, 'error' => 'Invalid context for this seller'], 422);
    }
}

try {
    [$low, $high] = ww_conv_ordered_pair($userId, $peerId);
} catch (InvalidArgumentException) {
    ww_json(['ok' => false, 'error' => 'Cannot message yourself'], 422);
}

try {
    $ins = $pdo->prepare(
        'INSERT INTO conversations (user_low_id, user_high_id, context_key) VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id), updated_at = CURRENT_TIMESTAMP'
    );
    $ins->execute([$low, $high, $contextKey]);
    $cid = (int) $pdo->lastInsertId();
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Conversation unavailable. See database/README.md (conversations).'], 500);
}

ww_json(['ok' => true, 'conversation_id' => $cid]);

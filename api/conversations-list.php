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

if (($user['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$userId = (int) $user['id'];

try {
    $sql = 'SELECT c.id, c.context_key, c.last_message_at, c.created_at,
            up.id AS peer_user_id, up.username AS peer_username,
            up.first_name AS peer_first, up.last_name AS peer_last, up.avatar_url AS peer_avatar,
            (SELECT IF(TRIM(COALESCE(m.body, \'\')) <> \'\', TRIM(m.body), CONCAT(\'📎 \', COALESCE(ma.file_name, \'File\')))
             FROM messages m
             LEFT JOIN message_attachments ma ON ma.message_id = m.id
             WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_body,
            (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.id DESC LIMIT 1) AS last_created
            FROM conversations c
            INNER JOIN users up ON up.id = CASE WHEN c.user_low_id = ? THEN c.user_high_id ELSE c.user_low_id END
            WHERE (c.user_low_id = ? OR c.user_high_id = ?)
            ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
            LIMIT 120';

    $st = $pdo->prepare($sql);
    $st->execute([$userId, $userId, $userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Inbox unavailable'], 500);
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id' => (int) $r['id'],
        'context_key' => (string) $r['context_key'],
        'peer' => [
            'user_id' => (int) $r['peer_user_id'],
            'username' => (string) $r['peer_username'],
            'label' => trim((string) $r['peer_first'] . ' ' . (string) $r['peer_last']),
            'avatar_url' => $r['peer_avatar'] ? (string) $r['peer_avatar'] : null,
        ],
        'last_message' => $r['last_body'] ? (string) $r['last_body'] : null,
        'last_message_at' => $r['last_created'] ? (string) $r['last_created'] : null,
        'updated_at' => $r['last_message_at'] ? (string) $r['last_message_at'] : (string) $r['created_at'],
    ];
}

ww_json(['ok' => true, 'conversations' => $list]);

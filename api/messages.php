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
$conversationId = (int) ($_GET['conversation_id'] ?? 0);
if ($conversationId <= 0) {
    ww_json(['ok' => false, 'error' => 'conversation_id required'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT id FROM conversations WHERE id = ? AND (user_low_id = ? OR user_high_id = ?) LIMIT 1'
    );
    $st->execute([$conversationId, $userId, $userId]);
    if (!$st->fetchColumn()) {
        ww_json(['ok' => false, 'error' => 'Conversation not found'], 404);
    }

    $afterId = (int) ($_GET['after_id'] ?? 0);
    $sql = 'SELECT m.id, m.sender_user_id, m.body, m.created_at,
            ma.id AS att_id, ma.file_name AS att_file_name, ma.mime_type AS att_mime, ma.file_size AS att_size
            FROM messages m
            LEFT JOIN message_attachments ma ON ma.message_id = m.id
            WHERE m.conversation_id = ?';
    $params = [$conversationId];
    if ($afterId > 0) {
        $sql .= ' AND m.id > ?';
        $params[] = $afterId;
    }
    $sql .= ' ORDER BY m.id ASC LIMIT 200';

    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Messages unavailable'], 500);
}

$list = [];
foreach ($rows as $r) {
    $attId = isset($r['att_id']) ? (int) $r['att_id'] : 0;
    $attachment = null;
    if ($attId > 0) {
        $attachment = [
            'id' => $attId,
            'file_name' => (string) $r['att_file_name'],
            'mime_type' => (string) $r['att_mime'],
            'file_size' => (int) $r['att_size'],
        ];
    }
    $list[] = [
        'id' => (int) $r['id'],
        'sender_user_id' => (int) $r['sender_user_id'],
        'body' => (string) $r['body'],
        'created_at' => (string) $r['created_at'],
        'mine' => (int) $r['sender_user_id'] === $userId,
        'attachment' => $attachment,
    ];
}

ww_json(['ok' => true, 'messages' => $list]);

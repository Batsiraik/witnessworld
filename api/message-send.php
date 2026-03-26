<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/message_file_rules.php';

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

$userId = (int) $user['id'];
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
$isMultipart = str_starts_with($contentType, 'multipart/form-data');

$conversationId = 0;
$text = '';
$uploadTmp = null;
$uploadOrigName = '';
$uploadClientMime = '';
$uploadSize = 0;

if ($isMultipart) {
    $conversationId = (int) ($_POST['conversation_id'] ?? 0);
    $text = trim((string) ($_POST['body'] ?? ''));
    if (!empty($_FILES['file']) && is_array($_FILES['file'])) {
        $f = $_FILES['file'];
        if (($f['error'] ?? UPLOAD_ERR_OK) === UPLOAD_ERR_OK && is_uploaded_file((string) ($f['tmp_name'] ?? ''))) {
            $uploadTmp = (string) $f['tmp_name'];
            $uploadOrigName = ww_message_attachment_safe_original_name((string) ($f['name'] ?? 'file'));
            $uploadClientMime = (string) ($f['type'] ?? 'application/octet-stream');
            $uploadSize = (int) ($f['size'] ?? 0);
        }
    }
} else {
    $body = ww_read_json();
    $conversationId = (int) ($body['conversation_id'] ?? 0);
    $text = trim((string) ($body['body'] ?? ''));
}

if ($conversationId <= 0) {
    ww_json(['ok' => false, 'error' => 'conversation_id required'], 422);
}

$hasFile = $uploadTmp !== null && $uploadTmp !== '';
if ($text === '' && !$hasFile) {
    ww_json(['ok' => false, 'error' => 'Message or file required'], 422);
}
if (mb_strlen($text) > 6000) {
    ww_json(['ok' => false, 'error' => 'Message too long (max 6000 characters)'], 422);
}

if ($hasFile && ($uploadSize <= 0 || $uploadSize > ww_message_attachment_max_bytes())) {
    ww_json(['ok' => false, 'error' => 'File must be between 1 byte and 15 MB'], 422);
}

$resolved = null;
if ($hasFile) {
    if (!class_exists('finfo')) {
        ww_json(['ok' => false, 'error' => 'Server fileinfo extension missing'], 500);
    }
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detected = $finfo->file($uploadTmp) ?: '';
    $resolved = ww_message_attachment_resolve_type($detected, $uploadOrigName);
    if ($resolved === null) {
        $resolved = ww_message_attachment_resolve_type($uploadClientMime, $uploadOrigName);
    }
    if ($resolved === null) {
        ww_json(['ok' => false, 'error' => 'File type not allowed (images, PDF, Word, Excel, TXT)'], 422);
    }
}

try {
    $st = $pdo->prepare(
        'SELECT id FROM conversations WHERE id = ? AND (user_low_id = ? OR user_high_id = ?) LIMIT 1'
    );
    $st->execute([$conversationId, $userId, $userId]);
    if (!$st->fetchColumn()) {
        ww_json(['ok' => false, 'error' => 'Conversation not found'], 404);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Database error'], 500);
}

$dir = dirname(__DIR__) . '/uploads/message_attachments';
if ($hasFile && !is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    ww_json(['ok' => false, 'error' => 'Server could not create upload folder'], 500);
}

$storageName = $hasFile ? (bin2hex(random_bytes(16)) . '.' . $resolved['ext']) : null;
$destPath = $hasFile ? ($dir . '/' . $storageName) : null;

try {
    $pdo->beginTransaction();
    $ins = $pdo->prepare(
        'INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?,?,?)'
    );
    $ins->execute([$conversationId, $userId, $text]);
    $mid = (int) $pdo->lastInsertId();

    $attachmentOut = null;
    if ($hasFile && $storageName !== null && $destPath !== null && $resolved !== null) {
        if (!move_uploaded_file($uploadTmp, $destPath)) {
            throw new RuntimeException('move_failed');
        }
        $insA = $pdo->prepare(
            'INSERT INTO message_attachments (message_id, file_name, mime_type, file_size, storage_name) VALUES (?,?,?,?,?)'
        );
        $insA->execute([
            $mid,
            $uploadOrigName,
            $resolved['mime'],
            $uploadSize,
            $storageName,
        ]);
        $aid = (int) $pdo->lastInsertId();
        $attachmentOut = [
            'id' => $aid,
            'file_name' => $uploadOrigName,
            'mime_type' => $resolved['mime'],
            'file_size' => $uploadSize,
        ];
    }

    $pdo->prepare('UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?')->execute([$conversationId]);
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if ($destPath !== null && is_file($destPath)) {
        @unlink($destPath);
    }
    if ($e->getMessage() === 'move_failed') {
        ww_json(['ok' => false, 'error' => 'Could not save file'], 500);
    }
    ww_json(['ok' => false, 'error' => 'Could not send message'], 500);
}

require_once __DIR__ . '/lib/push_notify.php';
try {
    $stc = $pdo->prepare(
        'SELECT user_low_id, user_high_id FROM conversations WHERE id = ? LIMIT 1'
    );
    $stc->execute([$conversationId]);
    $crow = $stc->fetch(PDO::FETCH_ASSOC);
    if ($crow) {
        $low = (int) $crow['user_low_id'];
        $high = (int) $crow['user_high_id'];
        $peerId = $userId === $low ? $high : $low;
        $preview = $text !== ''
            ? (mb_strlen($text) > 140 ? mb_substr($text, 0, 137) . '…' : $text)
            : ($hasFile ? 'Sent a file' : 'New message');
        ww_push_to_user(
            $pdo,
            $peerId,
            'New message',
            $preview,
            ['type' => 'new_message', 'conversation_id' => (string) $conversationId]
        );
    }
} catch (Throwable) {
    /* non-fatal */
}

ww_json([
    'ok' => true,
    'message' => [
        'id' => $mid,
        'sender_user_id' => $userId,
        'body' => $text,
        'mine' => true,
        'attachment' => $attachmentOut,
    ],
]);

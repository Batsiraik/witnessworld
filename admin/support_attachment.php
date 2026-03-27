<?php

declare(strict_types=1);

/**
 * View a message attachment for tech-support threads (admin session only).
 */

require_once __DIR__ . '/includes/guard.php';

$pdo = witnessworld_pdo();
$attachmentId = (int) ($_GET['id'] ?? 0);
if ($attachmentId <= 0) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid id';
    exit;
}

try {
    $st = $pdo->prepare(
        'SELECT ma.file_name, ma.mime_type, ma.file_size, ma.storage_name
         FROM message_attachments ma
         INNER JOIN messages m ON m.id = ma.message_id
         INNER JOIN conversations c ON c.id = m.conversation_id
         WHERE ma.id = ? AND c.context_key = ?
         LIMIT 1'
    );
    $st->execute([$attachmentId, 'support']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Server error';
    exit;
}

if (!$row) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}

$storageName = basename((string) $row['storage_name']);
$baseDir = dirname(__DIR__) . '/uploads/message_attachments';
$fullPath = $baseDir . '/' . $storageName;

if (!is_file($fullPath) || !is_readable($fullPath)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'File missing';
    exit;
}

$mime = (string) $row['mime_type'];
$downloadName = (string) $row['file_name'];
$size = (int) $row['file_size'];
if ($size <= 0) {
    $size = (int) filesize($fullPath);
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) $size);
header('Content-Disposition: inline; filename="' . str_replace(['"', "\r", "\n"], '', $downloadName) . '"');
header('Cache-Control: private, max-age=0, must-revalidate');
header('X-Content-Type-Options: nosniff');

readfile($fullPath);
exit;
</think>


<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
StrReplace
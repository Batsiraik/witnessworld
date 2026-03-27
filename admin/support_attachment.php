<?php

declare(strict_types=1);

/**
 * View a message attachment for Customer Support threads (admin session only).
 */

require_once __DIR__ . '/includes/guard.php';

/**
 * Header values must be single-line ASCII; bad DB values can make header() throw on PHP 8+.
 */
function ww_admin_safe_mime(string $raw): string
{
    $t = preg_replace('/[^\x20-\x7E]/', '', $raw) ?? '';
    $t = trim($t);

    return preg_match('#^[a-z0-9][a-z0-9/+.-]*$#i', $t) ? $t : 'application/octet-stream';
}

function ww_admin_safe_download_basename(string $raw): string
{
    $base = basename(str_replace(["\0", '/', '\\'], '', $raw));
    $base = preg_replace('/[^\x20-\x7E]/', '', $base) ?? '';
    $base = str_replace(['"', "\r", "\n"], '', $base);

    return $base !== '' ? $base : 'attachment';
}

$pdo = witnessworld_pdo();
$attachmentId = (int) ($_GET['id'] ?? 0);
if ($attachmentId <= 0) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid id';
    exit;
}

/** @var array<string, mixed>|false $row */
$row = false;
try {
    $st = $pdo->prepare(
        'SELECT ma.file_name, ma.mime_type, ma.file_size, ma.storage_name
         FROM message_attachments ma
         INNER JOIN messages m ON m.id = ma.message_id
         INNER JOIN conversations c ON c.id = m.conversation_id
         WHERE ma.id = ? AND LOWER(TRIM(c.context_key)) = ?
         LIMIT 1'
    );
    $st->execute([$attachmentId, 'support']);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    error_log('support_attachment query: ' . $e->getMessage());
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

$mime = ww_admin_safe_mime((string) $row['mime_type']);
$downloadName = ww_admin_safe_download_basename((string) $row['file_name']);
$size = (int) $row['file_size'];
if ($size <= 0) {
    $size = (int) @filesize($fullPath);
}

try {
    header('Content-Type: ' . $mime);
    header('Content-Length: ' . (string) max(0, $size));
    header('Content-Disposition: inline; filename="' . $downloadName . '"');
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('X-Content-Type-Options: nosniff');
} catch (Throwable $e) {
    error_log('support_attachment headers: ' . $e->getMessage());
    http_response_code(500);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Server error';
    exit;
}

$ok = @readfile($fullPath);
if ($ok === false) {
    http_response_code(500);
}
exit;

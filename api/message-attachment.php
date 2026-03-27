<?php

declare(strict_types=1);

/**
 * Download a message attachment (auth required). Not JSON — streams the file.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Authorization, X-Auth-Token, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    http_response_code(405);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Method not allowed';
    exit;
}

require_once __DIR__ . '/config.php';
require_once dirname(__DIR__) . '/admin/includes/conn.php';
require_once __DIR__ . '/lib/bearer_token.php';
require_once __DIR__ . '/lib/user_tokens.php';

$tok = ww_bearer_token();
if (!$tok) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unauthorized';
    exit;
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    http_response_code(401);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Unauthorized';
    exit;
}

$userId = (int) $user['id'];
$attachmentId = (int) ($_GET['id'] ?? 0);
if ($attachmentId <= 0) {
    http_response_code(422);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid id';
    exit;
}

$verified = ($user['status'] ?? '') === 'verified';
/** @var array<string, mixed>|false|null $row */
$row = null;

try {
    $sql = 'SELECT ma.file_name, ma.mime_type, ma.file_size, ma.storage_name, c.context_key
         FROM message_attachments ma
         INNER JOIN messages m ON m.id = ma.message_id
         INNER JOIN conversations c ON c.id = m.conversation_id
         WHERE ma.id = ? AND (c.user_low_id = ? OR c.user_high_id = ?)
         LIMIT 1';
    $st = $pdo->prepare($sql);
    $st->execute([$attachmentId, $userId, $userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if ($row && !$verified && strtolower(trim((string) ($row['context_key'] ?? ''))) !== 'support') {
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo 'Forbidden';
        exit;
    }
    if ($row) {
        unset($row['context_key']);
    }
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

$storageName = (string) $row['storage_name'];
$storageName = basename($storageName);
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
header('Content-Disposition: attachment; filename="' . str_replace(['"', "\r", "\n"], '', $downloadName) . '"');
header('Cache-Control: private, max-age=0, must-revalidate');
header('X-Content-Type-Options: nosniff');

readfile($fullPath);
exit;

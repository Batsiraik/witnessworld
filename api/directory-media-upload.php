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

if (($user['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$userId = (int) $user['id'];

if (empty($_FILES['file']) || !is_uploaded_file((string) ($_FILES['file']['tmp_name'] ?? ''))) {
    ww_json(['ok' => false, 'error' => 'No file uploaded (field name: file)'], 422);
}

$f = $_FILES['file'];
if (($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    ww_json(['ok' => false, 'error' => 'Upload failed'], 400);
}

$max = 5 * 1024 * 1024;
$size = (int) ($f['size'] ?? 0);
if ($size <= 0 || $size > $max) {
    ww_json(['ok' => false, 'error' => 'Image must be 5 MB or smaller'], 422);
}

$tmp = (string) $f['tmp_name'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = is_object($finfo) ? (string) $finfo->file($tmp) : '';

$imageMimes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];

if (!isset($imageMimes[$mime])) {
    ww_json(['ok' => false, 'error' => 'Use JPEG, PNG, or WebP'], 422);
}

$info = @getimagesize($tmp);
if ($info === false) {
    ww_json(['ok' => false, 'error' => 'Invalid image file'], 422);
}

$ext = $imageMimes[$mime];
$dir = dirname(__DIR__) . '/uploads/directory_logos/' . $userId;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    ww_json(['ok' => false, 'error' => 'Server could not create upload folder'], 500);
}

$name = 'logo_' . bin2hex(random_bytes(8)) . '.' . $ext;
$dest = $dir . '/' . $name;
if (!move_uploaded_file($tmp, $dest)) {
    ww_json(['ok' => false, 'error' => 'Could not save file'], 500);
}

$publicBase = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');
$url = $publicBase . '/uploads/directory_logos/' . $userId . '/' . $name;

ww_json(['ok' => true, 'url' => $url]);

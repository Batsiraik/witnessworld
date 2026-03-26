<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/profile_helpers.php';

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

$userId = (int) $user['id'];

if (empty($_FILES['avatar']) || !is_uploaded_file((string) ($_FILES['avatar']['tmp_name'] ?? ''))) {
    ww_json(['ok' => false, 'error' => 'No image uploaded (field name: avatar)'], 422);
}

$f = $_FILES['avatar'];
if (($f['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    ww_json(['ok' => false, 'error' => 'Upload failed'], 400);
}

$maxBytes = 2 * 1024 * 1024;
$size = (int) ($f['size'] ?? 0);
if ($size <= 0 || $size > $maxBytes) {
    ww_json(['ok' => false, 'error' => 'Image must be 2 MB or smaller'], 422);
}

$tmp = (string) $f['tmp_name'];
$info = @getimagesize($tmp);
if ($info === false) {
    ww_json(['ok' => false, 'error' => 'Invalid image file'], 422);
}

$mime = $info['mime'] ?? '';
$map = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/webp' => 'webp',
];
if (!isset($map[$mime])) {
    ww_json(['ok' => false, 'error' => 'Use JPEG, PNG, or WebP'], 422);
}
$ext = $map[$mime];

$dir = dirname(__DIR__) . '/uploads/avatars';
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    ww_json(['ok' => false, 'error' => 'Server could not create upload folder'], 500);
}

$name = $userId . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
$dest = $dir . '/' . $name;
if (!move_uploaded_file($tmp, $dest)) {
    ww_json(['ok' => false, 'error' => 'Could not save file'], 500);
}

$oldUrl = $user['avatar_url'] ?? null;
ww_delete_local_avatar_file(is_string($oldUrl) ? $oldUrl : null);

$publicBase = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');
$avatarUrl = $publicBase . '/uploads/avatars/' . $name;

$pdo->prepare('UPDATE users SET avatar_url = ? WHERE id = ?')->execute([$avatarUrl, $userId]);

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$userId]);
$row = $st->fetch(PDO::FETCH_ASSOC) ?: [];

ww_json([
    'ok' => true,
    'avatar_url' => $avatarUrl,
    'user' => ww_user_public($row),
]);

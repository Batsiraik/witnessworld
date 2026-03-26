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

$in = ww_read_json();
$current = (string) ($in['current_password'] ?? '');
$new = (string) ($in['new_password'] ?? '');

if ($current === '' || $new === '') {
    ww_json(['ok' => false, 'error' => 'Current and new passwords are required'], 422);
}

if (strlen($new) < 8) {
    ww_json(['ok' => false, 'error' => 'New password must be at least 8 characters'], 422);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

if (!password_verify($current, (string) ($user['password_hash'] ?? ''))) {
    ww_json(['ok' => false, 'error' => 'Current password is incorrect'], 401);
}

$hash = password_hash($new, PASSWORD_DEFAULT);
$pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([$hash, (int) $user['id']]);

ww_json(['ok' => true]);

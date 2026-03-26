<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$resetToken = trim((string) ($in['reset_token'] ?? ''));
$password = (string) ($in['password'] ?? '');
$confirm = (string) ($in['confirm_password'] ?? $password);

if ($email === '' || $resetToken === '' || strlen($password) < 8) {
    ww_json(['ok' => false, 'error' => 'Email, reset token, and password (8+ chars) are required'], 422);
}
if ($password !== $confirm) {
    ww_json(['ok' => false, 'error' => 'Passwords do not match'], 422);
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user || !hash_equals((string) ($user['password_reset_token'] ?? ''), $resetToken)) {
    ww_json(['ok' => false, 'error' => 'Invalid or expired reset session'], 400);
}

$tex = $user['password_reset_token_expires_at'] ?? null;
if ($tex && strtotime((string) $tex) < time()) {
    ww_json(['ok' => false, 'error' => 'Reset session expired'], 400);
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$pdo->prepare(
    'UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?'
)->execute([$hash, (int) $user['id']]);

$token = ww_issue_user_token($pdo, (int) $user['id']);
$st2 = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st2->execute([(int) $user['id']]);
$fresh = $st2->fetch(PDO::FETCH_ASSOC);

ww_json([
    'ok' => true,
    'token' => $token,
    'user' => ww_user_public($fresh ?: []),
]);

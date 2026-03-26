<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$otp = preg_replace('/\D/', '', (string) ($in['otp'] ?? ''));

if ($email === '' || strlen($otp) !== 6) {
    ww_json(['ok' => false, 'error' => 'Email and 6-digit code are required'], 422);
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user || (string) ($user['password_reset_otp'] ?? '') !== $otp) {
    ww_json(['ok' => false, 'error' => 'Invalid or expired code'], 400);
}

$exp = $user['password_reset_expires_at'] ?? null;
if ($exp && strtotime((string) $exp) < time()) {
    ww_json(['ok' => false, 'error' => 'Code has expired'], 400);
}

$resetToken = bin2hex(random_bytes(32));
$tokExp = (new DateTimeImmutable())->modify('+20 minutes')->format('Y-m-d H:i:s');
$pdo->prepare(
    'UPDATE users SET password_reset_token = ?, password_reset_token_expires_at = ?, password_reset_otp = NULL, password_reset_expires_at = NULL WHERE id = ?'
)->execute([$resetToken, $tokExp, (int) $user['id']]);

$out = ['ok' => true, 'reset_token' => $resetToken, 'email' => $email];
if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
    $out['debug_reset_token'] = $resetToken;
}
ww_json($out);

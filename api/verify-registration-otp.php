<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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
$st = $pdo->prepare(
    'SELECT * FROM users WHERE email = ? AND status = ? LIMIT 1'
);
$st->execute([$email, 'pending_otp']);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user || (string) ($user['registration_otp'] ?? '') !== $otp) {
    ww_json(['ok' => false, 'error' => 'Invalid or expired code'], 400);
}
if (strtolower(trim((string) ($user['email'] ?? ''))) !== $email) {
    ww_json(['ok' => false, 'error' => 'Invalid or expired code'], 400);
}

$exp = $user['registration_otp_expires_at'] ?? null;
if ($exp && strtotime((string) $exp) < time()) {
    ww_json(['ok' => false, 'error' => 'Code has expired. Request a new code from the app.'], 400);
}

$up = $pdo->prepare(
    'UPDATE users SET status = ?, registration_otp = NULL, registration_otp_expires_at = NULL WHERE id = ?'
);
$up->execute(['pending_questions', (int) $user['id']]);

$token = ww_issue_user_token($pdo, (int) $user['id']);
$st2 = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st2->execute([(int) $user['id']]);
$fresh = $st2->fetch(PDO::FETCH_ASSOC);

ww_json([
    'ok' => true,
    'token' => $token,
    'user' => ww_user_public($fresh ?: []),
]);

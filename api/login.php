<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/registration_otp.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$password = (string) ($in['password'] ?? '');

if ($email === '' || $password === '') {
    ww_json(['ok' => false, 'error' => 'Email and password are required'], 422);
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user || !password_verify($password, (string) $user['password_hash'])) {
    ww_json(['ok' => false, 'error' => 'Invalid email or password'], 401);
}
// Defensive: ensure row email matches request (rules out any odd driver/encoding edge cases).
if (strtolower(trim((string) ($user['email'] ?? ''))) !== $email) {
    ww_json(['ok' => false, 'error' => 'Invalid email or password'], 401);
}

if (($user['status'] ?? '') === 'pending_otp') {
    $send = ww_send_registration_otp($pdo, $user, true);
    $message = $send['ok']
        ? 'We sent a verification code to your email. Enter it below to finish signing up.'
        : ($send['error'] ?? 'Please verify your email first using the code we sent you.');
    ww_json([
        'ok' => false,
        'error' => $message,
        'code' => 'pending_otp',
        'otp_sent' => $send['ok'] === true,
        'retry_after' => $send['retry_after'] ?? null,
    ], 403);
}

$token = ww_issue_user_token($pdo, (int) $user['id']);

ww_json([
    'ok' => true,
    'token' => $token,
    'user' => ww_user_public($user),
]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/registration_otp.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$password = (string) ($in['password'] ?? '');

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ww_json(['ok' => false, 'error' => 'Valid email is required'], 422);
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);

$generic = [
    'ok' => true,
    'message' => 'If your account is waiting for email verification, we sent a new code. Check your spam folder if it does not arrive within a few minutes.',
];

if (!$user || ($user['status'] ?? '') !== 'pending_otp') {
    ww_json($generic);
}

if ($password !== '' && !password_verify($password, (string) $user['password_hash'])) {
    ww_json(['ok' => false, 'error' => 'Invalid email or password'], 401);
}

$send = ww_send_registration_otp($pdo, $user, true);
if (!$send['ok']) {
    ww_json([
        'ok' => false,
        'error' => $send['error'] ?? 'Could not send code',
        'retry_after' => $send['retry_after'] ?? null,
    ], 429);
}

$out = [
    'ok' => true,
    'message' => 'We sent a new verification code to your email.',
    'email_sent' => $send['email_sent'] ?? true,
];
if (isset($send['otp'])) {
    $out['debug_otp'] = $send['otp'];
}
ww_json($out);

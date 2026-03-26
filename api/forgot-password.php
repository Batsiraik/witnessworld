<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/Mailer.php';
require_once __DIR__ . '/lib/EmailTemplates.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ww_json(['ok' => false, 'error' => 'Valid email is required'], 422);
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT id, first_name, last_name, email FROM users WHERE email = ? LIMIT 1');
$st->execute([$email]);
$user = $st->fetch(PDO::FETCH_ASSOC);

// Always same response to avoid email enumeration
$generic = ['ok' => true, 'message' => 'If an account exists for that email, we sent a reset code.'];

if (!$user) {
    ww_json($generic);
}

$otp = (string) random_int(100000, 999999);
$exp = (new DateTimeImmutable())->modify('+30 minutes')->format('Y-m-d H:i:s');
$pdo->prepare(
    'UPDATE users SET password_reset_otp = ?, password_reset_expires_at = ?, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = ?'
)->execute([$otp, $exp, (int) $user['id']]);

$mailer = new Mailer($pdo);
$name = trim((string) $user['first_name'] . ' ' . (string) $user['last_name']);
$subject = 'Your Witness World Connect password reset code';
$logo = (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;
$tpl = EmailTemplates::passwordResetOtp((string) $user['first_name'], $otp, $logo);
$sent = $mailer->send((string) $user['email'], $name, $subject, $tpl['html'], $tpl['text']);

$out = $generic;
$out['email_sent'] = $sent;
if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
    $out['debug_otp'] = $otp;
}
ww_json($out);

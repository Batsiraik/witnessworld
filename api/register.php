<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/Mailer.php';
require_once __DIR__ . '/lib/EmailTemplates.php';
require_once __DIR__ . '/lib/subscription_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$in = ww_read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$password = (string) ($in['password'] ?? '');
$first = trim((string) ($in['first_name'] ?? ''));
$last = trim((string) ($in['last_name'] ?? ''));
$username = strtolower(preg_replace('/\s+/', '', (string) ($in['username'] ?? '')));
$phone = trim((string) ($in['phone'] ?? ''));
$dateOfBirth = trim((string) ($in['date_of_birth'] ?? ''));
$memberType = trim((string) ($in['member_type'] ?? ''));
$baptismDate = trim((string) ($in['baptism_date'] ?? ''));
$congregation = trim((string) ($in['congregation'] ?? ''));
$plan = ww_valid_membership_plan(strtolower(trim((string) ($in['membership_plan'] ?? 'free'))));

$parseDate = static function (string $value): ?DateTimeImmutable {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        return null;
    }
    return $date;
};

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    ww_json(['ok' => false, 'error' => 'Valid email is required'], 422);
}
if (strlen($password) < 8) {
    ww_json(['ok' => false, 'error' => 'Password must be at least 8 characters'], 422);
}
if ($first === '' || $last === '') {
    ww_json(['ok' => false, 'error' => 'First and last name are required'], 422);
}
if ($username === '' || strlen($username) < 2) {
    ww_json(['ok' => false, 'error' => 'Username is required'], 422);
}
if ($phone === '') {
    ww_json(['ok' => false, 'error' => 'Phone is required'], 422);
}
$dob = $parseDate($dateOfBirth);
if (!$dob) {
    ww_json(['ok' => false, 'error' => 'Valid date of birth is required'], 422);
}
$today = new DateTimeImmutable('today');
if ($dob->diff($today)->y < 18) {
    ww_json(['ok' => false, 'error' => 'You must be at least 18 to sign up'], 422);
}
if ($memberType === '') {
    ww_json(['ok' => false, 'error' => 'I am a field is required'], 422);
}
if (!$parseDate($baptismDate)) {
    ww_json(['ok' => false, 'error' => 'Valid baptism date is required'], 422);
}
if ($congregation === '') {
    ww_json(['ok' => false, 'error' => 'Congregation is required'], 422);
}

$pdo = witnessworld_pdo();

$chk = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
$chk->execute([$email]);
if ($chk->fetch()) {
    ww_json([
        'ok' => false,
        'error' => 'An account with this email already exists. Please log in or use Forgot password.',
        'code' => 'email_taken',
    ], 409);
}

$chk2 = $pdo->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
$chk2->execute([$username]);
if ($chk2->fetch()) {
    ww_json(['ok' => false, 'error' => 'This username is already taken.', 'code' => 'username_taken'], 409);
}

$otp = (string) random_int(100000, 999999);
$otpExpires = (new DateTimeImmutable())->modify('+30 minutes')->format('Y-m-d H:i:s');
$hash = password_hash($password, PASSWORD_DEFAULT);
$trialDays = ww_membership_trial_days($pdo);
$isPaidPlan = $plan !== 'free';
$trialStartedAt = $isPaidPlan ? date('Y-m-d H:i:s') : null;
$trialEndsAt = $isPaidPlan ? (new DateTimeImmutable())->modify('+' . $trialDays . ' days')->format('Y-m-d H:i:s') : null;
$subscriptionStatus = $isPaidPlan ? 'trialing' : 'free';
$paymentMethodStatus = $isPaidPlan ? 'missing' : 'none';

$ins = $pdo->prepare(
    'INSERT INTO users (email, password_hash, first_name, last_name, username, phone, date_of_birth, member_type, baptism_date, congregation, membership_plan, subscription_status, trial_started_at, trial_ends_at, stripe_payment_method_status, status, registration_otp, registration_otp_expires_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
);
$ins->execute([
    $email,
    $hash,
    $first,
    $last,
    $username,
    $phone,
    $dateOfBirth,
    $memberType,
    $baptismDate,
    $congregation,
    $plan,
    $subscriptionStatus,
    $trialStartedAt,
    $trialEndsAt,
    $paymentMethodStatus,
    'pending_otp',
    $otp,
    $otpExpires,
]);

$mailer = new Mailer($pdo);
$subject = 'Your Witness World Connect verification code';
$logo = (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;
$tpl = EmailTemplates::registrationOtp($first, $otp, $logo);
$sent = $mailer->send($email, $first . ' ' . $last, $subject, $tpl['html'], $tpl['text']);

$out = [
    'ok' => true,
    'message' => 'We sent a verification code to your email.',
    'email' => $email,
    'email_sent' => $sent,
];
if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
    $out['debug_otp'] = $otp;
}
ww_json($out);

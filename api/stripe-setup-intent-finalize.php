<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/subscription_helpers.php';
require_once __DIR__ . '/lib/stripe_payment_method_sync.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

if (!defined('WW_STRIPE_SECRET_KEY')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}
$sk = trim((string) WW_STRIPE_SECRET_KEY);
if ($sk === '' || !str_starts_with($sk, 'sk_')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}

$in = ww_read_json();
$setupIntentId = trim((string) ($in['setup_intent_id'] ?? ''));
if ($setupIntentId === '' || !preg_match('/^seti_[A-Za-z0-9_]+$/', $setupIntentId)) {
    ww_json(['ok' => false, 'error' => 'Invalid setup reference'], 422);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$userId = (int) $user['id'];
$stripe = new \Stripe\StripeClient($sk);

try {
    $si = $stripe->setupIntents->retrieve($setupIntentId);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not verify setup. Try again.'], 502);
}

if (($si->status ?? '') !== 'succeeded') {
    ww_json(['ok' => false, 'error' => 'Card setup is not complete yet.'], 422);
}

$metaUid = (int) ($si->metadata['user_id'] ?? 0);
if ($metaUid > 0 && $metaUid !== $userId) {
    ww_json(['ok' => false, 'error' => 'This session does not match your account.'], 403);
}

$customerRaw = $si->customer ?? null;
$customerId = is_string($customerRaw) ? $customerRaw : (string) ($customerRaw->id ?? '');
$customerId = trim($customerId);

$dbCust = trim((string) ($user['stripe_customer_id'] ?? ''));
if ($dbCust !== '' && $customerId !== '' && $dbCust !== $customerId) {
    ww_json(['ok' => false, 'error' => 'Billing profile mismatch.'], 403);
}

if ($dbCust === '' && $customerId !== '') {
    $pdo->prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')->execute([$customerId, $userId]);
}

$pmRaw = $si->payment_method ?? null;
$pmId = is_string($pmRaw) ? $pmRaw : (string) ($pmRaw->id ?? '');
if ($pmId === '') {
    ww_json(['ok' => false, 'error' => 'No payment method on this setup.'], 422);
}

ww_stripe_sync_user_payment_method($pdo, $stripe, $userId, $customerId, $pmId);

$fresh = ww_user_from_token($pdo, $tok);
ww_json([
    'ok' => true,
    'subscription' => ww_subscription_payload($pdo, $fresh ?: $user),
]);

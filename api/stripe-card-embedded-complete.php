<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/stripe_card_embed_session.php';
require_once __DIR__ . '/lib/stripe_payment_method_sync.php';
require_once __DIR__ . '/lib/subscription_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

if (!defined('WW_STRIPE_SECRET_KEY')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}
$sk = trim((string) WW_STRIPE_SECRET_KEY);
if ($sk === '' || !str_starts_with($sk, 'sk_')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}

$in = ww_read_json();
$t = trim((string) ($in['t'] ?? ''));
if (!preg_match('/^[a-f0-9]{64}$/', $t)) {
    ww_json(['ok' => false, 'error' => 'Invalid session'], 422);
}

$session = ww_stripe_embed_load($t);
if (!$session) {
    ww_json(['ok' => false, 'error' => 'Session expired. Close this screen and try again from the app.'], 410);
}

$claimedId = trim((string) ($in['setup_intent_id'] ?? ''));
if ($claimedId === '' || $claimedId !== $session['setup_intent_id']) {
    ww_json(['ok' => false, 'error' => 'Invalid setup reference'], 422);
}

$userId = (int) $session['user_id'];
$pdo = witnessworld_pdo();
$stripe = new \Stripe\StripeClient($sk);

try {
    $si = $stripe->setupIntents->retrieve($claimedId);
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

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$userId]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    ww_stripe_embed_delete($t);
    ww_json(['ok' => false, 'error' => 'User not found'], 404);
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

try {
    ww_stripe_sync_user_payment_method($pdo, $stripe, $userId, $customerId, $pmId);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not save payment method. Try again.'], 500);
}

ww_stripe_embed_delete($t);

$st->execute([$userId]);
$fresh = $st->fetch(PDO::FETCH_ASSOC);

ww_json([
    'ok' => true,
    'subscription' => ww_subscription_payload($pdo, $fresh ?: $user),
]);

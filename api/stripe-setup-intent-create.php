<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/stripe_billing.php';

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

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$userId = (int) $user['id'];
$pk = ww_stripe_publishable_key($pdo);
if ($pk === '' || !str_starts_with($pk, 'pk_')) {
    ww_json(['ok' => false, 'error' => 'Stripe publishable key is not configured (admin settings or WW_STRIPE_PUBLISHABLE_KEY).'], 503);
}

$stripe = new \Stripe\StripeClient($sk);

try {
    $customerId = ww_stripe_ensure_customer($stripe, $pdo, $user);
    $si = $stripe->setupIntents->create([
        'customer' => $customerId,
        'payment_method_types' => ['card'],
        'usage' => 'off_session',
        'metadata' => ['user_id' => (string) $userId],
    ]);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not start card setup. Try again later.'], 500);
}

$secret = $si->client_secret ?? '';
if (!is_string($secret) || $secret === '') {
    ww_json(['ok' => false, 'error' => 'Could not start card setup.'], 500);
}

ww_json([
    'ok' => true,
    'publishable_key' => $pk,
    'client_secret' => $secret,
]);

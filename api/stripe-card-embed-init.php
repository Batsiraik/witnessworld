<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/stripe_billing.php';
require_once __DIR__ . '/lib/stripe_card_embed_session.php';

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
$setiId = (string) ($si->id ?? '');
if (!is_string($secret) || $secret === '' || $setiId === '') {
    ww_json(['ok' => false, 'error' => 'Could not start card setup.'], 500);
}

$embedId = bin2hex(random_bytes(32));
try {
    ww_stripe_embed_save($embedId, [
        'user_id' => $userId,
        'client_secret' => $secret,
        'publishable_key' => $pk,
        'setup_intent_id' => $setiId,
    ]);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not create embed session.'], 500);
}

$pageUrl = rtrim(WW_PUBLIC_BASE, '/') . '/api/stripe-card-embedded.php?t=' . rawurlencode($embedId);

ww_json([
    'ok' => true,
    'url' => $pageUrl,
]);

<?php

declare(strict_types=1);

/**
 * Starts “add card” for the app WebView: returns Stripe **hosted Checkout** (setup mode) URL.
 * Success/cancel land on stripe-setup-return.php / stripe-setup-cancel.php (postMessage to RN).
 */
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

$stripe = new \Stripe\StripeClient($sk);

try {
    $customerId = ww_stripe_ensure_customer($stripe, $pdo, $user);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not prepare billing profile. Try again later.'], 500);
}

$successUrl = WW_API_BASE . '/stripe-setup-return.php?session_id={CHECKOUT_SESSION_ID}';
$cancelUrl = WW_API_BASE . '/stripe-setup-cancel.php';

try {
    $session = $stripe->checkout->sessions->create([
        'mode' => 'setup',
        /** Required on current Stripe API versions for Checkout Session (even setup-only flows). */
        'currency' => 'usd',
        'customer' => $customerId,
        'client_reference_id' => (string) $userId,
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'payment_method_types' => ['card'],
        'setup_intent_data' => [
            'metadata' => ['user_id' => (string) $userId],
        ],
    ]);
} catch (\Throwable $e) {
    error_log('[stripe-card-embed-init] ' . $e->getMessage());
    $msg = 'Could not start card setup. Try again later.';
    $showDetail = (defined('WW_API_DEBUG') && WW_API_DEBUG) || str_starts_with($sk, 'sk_test_');
    if ($showDetail) {
        $msg .= ' ' . $e->getMessage();
        if ($e instanceof \Stripe\Exception\ApiErrorException) {
            $code = $e->getStripeCode();
            if (is_string($code) && $code !== '') {
                $msg .= ' [' . $code . ']';
            }
        }
    }
    ww_json(['ok' => false, 'error' => $msg], 500);
}

$url = $session->url ?? '';
if (!is_string($url) || $url === '') {
    ww_json(['ok' => false, 'error' => 'Could not start card setup.'], 500);
}

ww_json([
    'ok' => true,
    'url' => $url,
]);

<?php

declare(strict_types=1);

/**
 * POST — start “add card”: returns Stripe hosted Checkout URL (device browser + deep link return).
 * Legacy name kept for the mobile app endpoint.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/stripe_checkout_setup.php';

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

$stripe = new \Stripe\StripeClient($sk);

try {
    $checkout = ww_stripe_create_setup_checkout_session($stripe, $pdo, $user);
} catch (\Throwable $e) {
    error_log('[stripe-card-embed-init] ' . $e->getMessage());
    $msg = 'Could not start card setup. Try again later.';
    $showDetail = (defined('WW_API_DEBUG') && WW_API_DEBUG) || str_starts_with($sk, 'sk_test_');
    if ($showDetail) {
        $msg .= ' ' . $e->getMessage();
    }
    ww_json(['ok' => false, 'error' => $msg], 500);
}

ww_json([
    'ok' => true,
    'url' => $checkout['url'],
    'checkout' => true,
]);

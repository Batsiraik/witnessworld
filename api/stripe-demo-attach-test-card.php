<?php

declare(strict_types=1);

/**
 * Staging / QA only: attach Stripe test Visa (4242…) on the server so the app can skip native CardField
 * (which can crash on some Android builds). Never enable with live Stripe keys.
 */
require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/subscription_helpers.php';
require_once __DIR__ . '/lib/stripe_billing.php';
require_once __DIR__ . '/lib/stripe_payment_method_sync.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

if (!defined('WW_STRIPE_DEMO_ATTACH') || !WW_STRIPE_DEMO_ATTACH) {
    ww_json(['ok' => false, 'error' => 'Demo card attach is not enabled on this server.'], 403);
}

if (!defined('WW_STRIPE_SECRET_KEY')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}
$sk = trim((string) WW_STRIPE_SECRET_KEY);
if ($sk === '' || !str_starts_with($sk, 'sk_test_')) {
    ww_json(['ok' => false, 'error' => 'Demo attach is only allowed with Stripe test secret keys (sk_test_…).'], 403);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
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

    if (trim((string) ($user['stripe_payment_method_status'] ?? '')) === 'attached') {
        $fresh = ww_user_from_token($pdo, $tok);
        ww_json([
            'ok' => true,
            'already' => true,
            'subscription' => ww_subscription_payload($pdo, $fresh ?: $user),
        ]);
    }

    $pm = $stripe->paymentMethods->create([
        'type' => 'card',
        'card' => [
            'number' => '4242424242424242',
            'exp_month' => 12,
            'exp_year' => 2034,
            'cvc' => '123',
        ],
    ]);

    $stripe->paymentMethods->attach($pm->id, ['customer' => $customerId]);
    ww_stripe_sync_user_payment_method($pdo, $stripe, $userId, $customerId, $pm->id);

    $fresh = ww_user_from_token($pdo, $tok);
    ww_json([
        'ok' => true,
        'subscription' => ww_subscription_payload($pdo, $fresh ?: $user),
    ]);
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not attach test card. Try again later.'], 500);
}

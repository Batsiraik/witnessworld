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

if (!defined('WW_STRIPE_SECRET_KEY')) {
    ww_json(['ok' => false, 'error' => 'Billing is not configured on this server.'], 503);
}
$sk = trim((string) WW_STRIPE_SECRET_KEY);
if ($sk === '' || !str_starts_with($sk, 'sk_test_')) {
    ww_json(['ok' => false, 'error' => 'Demo card attach only works when this server uses a Stripe test secret key (sk_test_…). Live keys cannot use this endpoint.'], 403);
}

/** Optional opt-out in api/config.local.php: define('WW_STRIPE_DEMO_DISABLE', true); */
if (defined('WW_STRIPE_DEMO_DISABLE') && WW_STRIPE_DEMO_DISABLE) {
    ww_json(['ok' => false, 'error' => 'Demo card attach is disabled on this server.'], 403);
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

$testCard = [
    'number' => '4242424242424242',
    'exp_month' => 12,
    'exp_year' => 2034,
    'cvc' => '123',
];

/**
 * Some Stripe accounts block PaymentMethods::create with raw PAN; SetupIntent + confirm often still works in test mode.
 * If both fail, check PHP error log and Stripe Dashboard → Settings → "Handle card information" / API version.
 *
 * @throws \Throwable
 */
$resolveTestPaymentMethodId = static function (\Stripe\StripeClient $stripe, string $customerId) use ($testCard): string {
    try {
        $si = $stripe->setupIntents->create([
            'customer' => $customerId,
            'payment_method_types' => ['card'],
            'usage' => 'off_session',
            'payment_method_data' => [
                'type' => 'card',
                'card' => $testCard,
            ],
            'confirm' => true,
        ]);
        $status = (string) ($si->status ?? '');
        if ($status !== 'succeeded') {
            throw new \RuntimeException('SetupIntent status is ' . $status . ' (expected succeeded).');
        }
        $rawPm = $si->payment_method ?? null;
        $pmId = is_string($rawPm) ? $rawPm : (string) ($rawPm->id ?? '');
        if ($pmId === '') {
            throw new \RuntimeException('SetupIntent has no payment_method id.');
        }

        return $pmId;
    } catch (\Throwable) {
        $pm = $stripe->paymentMethods->create([
            'type' => 'card',
            'card' => $testCard,
        ]);
        $stripe->paymentMethods->attach($pm->id, ['customer' => $customerId]);

        return (string) $pm->id;
    }
};

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

    $pmId = $resolveTestPaymentMethodId($stripe, $customerId);
    ww_stripe_sync_user_payment_method($pdo, $stripe, $userId, $customerId, $pmId);

    $fresh = ww_user_from_token($pdo, $tok);
    ww_json([
        'ok' => true,
        'subscription' => ww_subscription_payload($pdo, $fresh ?: $user),
    ]);
} catch (\Throwable $e) {
    error_log('[stripe-demo-attach-test-card] ' . $e->getMessage());
    $hint = 'Could not attach test card. Check the server PHP error log for details.';
    if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
        $hint .= ' Stripe/API: ' . $e->getMessage();
    }
    ww_json(['ok' => false, 'error' => $hint], 500);
}

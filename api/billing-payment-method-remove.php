<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/subscription_helpers.php';

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
$customerId = trim((string) ($user['stripe_customer_id'] ?? ''));
if ($customerId === '') {
    ww_json(['ok' => false, 'error' => 'No saved billing customer on this account.'], 422);
}

$stripe = new \Stripe\StripeClient($sk);

try {
    $customer = $stripe->customers->retrieve(
        $customerId,
        ['expand' => ['invoice_settings.default_payment_method']]
    );
} catch (\Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not load billing profile. Try again later.'], 502);
}

$dpm = $customer->invoice_settings->default_payment_method ?? null;
$defaultPmId = is_string($dpm) ? $dpm : (string) ($dpm->id ?? '');

$detached = false;
if ($defaultPmId !== '') {
    try {
        $stripe->paymentMethods->detach($defaultPmId);
        $detached = true;
    } catch (\Throwable) {
        // May already be detached; continue clearing default.
    }
}

if (!$detached) {
    try {
        $list = $stripe->paymentMethods->all([
            'customer' => $customerId,
            'type' => 'card',
            'limit' => 20,
        ]);
        foreach ($list->data as $pm) {
            $id = (string) ($pm->id ?? '');
            if ($id !== '') {
                try {
                    $stripe->paymentMethods->detach($id);
                    $detached = true;
                } catch (\Throwable) {
                    // ignore
                }
            }
        }
    } catch (\Throwable) {
        // ignore
    }
}

try {
    $stripe->customers->update($customerId, [
        'invoice_settings' => ['default_payment_method' => null],
    ]);
} catch (\Throwable) {
    // ignore
}

$plan = ww_valid_membership_plan((string) ($user['membership_plan'] ?? 'free'));
$nextPm = $plan === 'free' ? 'none' : 'missing';

$pdo->prepare(
    'UPDATE users SET stripe_payment_method_status = ?, stripe_pm_last4 = NULL, stripe_pm_brand = NULL WHERE id = ?'
)->execute([$nextPm, $userId]);

$fresh = ww_user_from_token($pdo, $tok);
ww_json(['ok' => true, 'subscription' => ww_subscription_payload($pdo, $fresh ?: $user)]);

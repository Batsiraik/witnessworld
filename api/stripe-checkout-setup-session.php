<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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
$email = trim((string) ($user['email'] ?? ''));
$name = trim(trim(((string) ($user['first_name'] ?? '')) . ' ' . ((string) ($user['last_name'] ?? ''))));

$stripe = new \Stripe\StripeClient($sk);

$customerId = trim((string) ($user['stripe_customer_id'] ?? ''));
if ($customerId === '') {
    $params = ['metadata' => ['user_id' => (string) $userId]];
    if ($email !== '') {
        $params['email'] = $email;
    }
    if ($name !== '') {
        $params['name'] = $name;
    }
    $c = $stripe->customers->create($params);
    $customerId = (string) $c->id;
    $pdo->prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')->execute([$customerId, $userId]);
}

$successUrl = WW_API_BASE . '/stripe-setup-return.php?session_id={CHECKOUT_SESSION_ID}';
$cancelUrl = WW_API_BASE . '/stripe-setup-cancel.php';

try {
    $session = $stripe->checkout->sessions->create([
        'mode' => 'setup',
        'customer' => $customerId,
        'client_reference_id' => (string) $userId,
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'setup_intent_data' => [
            'metadata' => ['user_id' => (string) $userId],
        ],
    ]);
} catch (\Throwable $e) {
    error_log('[stripe-checkout-setup-session] ' . $e->getMessage());
    $msg = 'Could not start card setup. Try again later.';
    if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
        $msg .= ' (' . $e->getMessage() . ')';
    }
    ww_json(['ok' => false, 'error' => $msg], 500);
}

$url = $session->url ?? '';
if (!is_string($url) || $url === '') {
    ww_json(['ok' => false, 'error' => 'Could not start card setup.'], 500);
}

ww_json(['ok' => true, 'url' => $url]);

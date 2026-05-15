<?php

declare(strict_types=1);

require_once __DIR__ . '/stripe_billing.php';

/** Deep link scheme must match mobile-app app.json `"scheme": "witnessworldconnect"`. */
function ww_stripe_app_scheme(): string
{
    return 'witnessworldconnect';
}

/**
 * Create a Stripe Checkout Session (setup mode) for saving a payment method.
 * Opens on checkout.stripe.com; success/cancel pages redirect back into the app.
 *
 * @return array{url: string, session_id: string}
 */
function ww_stripe_create_setup_checkout_session(
    \Stripe\StripeClient $stripe,
    PDO $pdo,
    array $user
): array {
    $userId = (int) ($user['id'] ?? 0);
    if ($userId < 1) {
        throw new InvalidArgumentException('Invalid user');
    }

    $customerId = ww_stripe_ensure_customer($stripe, $pdo, $user);

    $successUrl = WW_API_BASE . '/stripe-setup-return.php?session_id={CHECKOUT_SESSION_ID}';
    $cancelUrl = WW_API_BASE . '/stripe-setup-cancel.php';

    $params = [
        'mode' => 'setup',
        'currency' => 'usd',
        'customer' => $customerId,
        'client_reference_id' => (string) $userId,
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'setup_intent_data' => [
            'metadata' => ['user_id' => (string) $userId],
        ],
        /* Wallets (Link, Cash App Pay, etc.) follow what is enabled on your Stripe account. */
        'automatic_payment_methods' => [
            'enabled' => true,
        ],
    ];

    $session = $stripe->checkout->sessions->create($params);

    $url = $session->url ?? '';
    $sessionId = (string) ($session->id ?? '');
    if (!is_string($url) || $url === '' || $sessionId === '') {
        throw new RuntimeException('Checkout session missing URL');
    }

    return ['url' => $url, 'session_id' => $sessionId];
}

function ww_stripe_redirect_to_app(string $path): void
{
    $scheme = ww_stripe_app_scheme();
    $target = $scheme . '://' . ltrim($path, '/');
    $safe = htmlspecialchars($target, ENT_QUOTES, 'UTF-8');
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
    echo '<meta name="viewport" content="width=device-width,initial-scale=1">';
    echo '<title>Returning to app</title>';
    echo '<meta http-equiv="refresh" content="0;url=' . $safe . '">';
    echo '</head><body style="font-family:system-ui,sans-serif;padding:24px;text-align:center">';
    echo '<p>Returning to Witness World Connect…</p>';
    echo '<p><a href="' . $safe . '">Tap here if the app does not open</a></p>';
    echo '<script>window.location.replace(' . json_encode($target, JSON_THROW_ON_ERROR) . ');</script>';
    echo '</body></html>';
}

<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/admin/includes/settings_store.php';

function ww_stripe_publishable_key(PDO $pdo): string
{
    if (defined('WW_STRIPE_PUBLISHABLE_KEY')) {
        $k = trim((string) WW_STRIPE_PUBLISHABLE_KEY);
        if ($k !== '') {
            return $k;
        }
    }

    return trim((string) (ww_get_setting($pdo, 'stripe_publishable_key', '') ?: ''));
}

/**
 * @param array<string, mixed> $user Row from users (needs id, stripe_customer_id, email, first_name, last_name)
 */
function ww_stripe_ensure_customer(\Stripe\StripeClient $stripe, PDO $pdo, array $user): string
{
    $userId = (int) ($user['id'] ?? 0);
    $customerId = trim((string) ($user['stripe_customer_id'] ?? ''));
    if ($customerId !== '') {
        return $customerId;
    }

    $email = trim((string) ($user['email'] ?? ''));
    $name = trim(trim(((string) ($user['first_name'] ?? '')) . ' ' . ((string) ($user['last_name'] ?? ''))));
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

    return $customerId;
}

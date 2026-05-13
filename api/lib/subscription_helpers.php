<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/admin/includes/settings_store.php';

/**
 * @return array<string, array<string, mixed>>
 */
function ww_subscription_plans(): array
{
    return [
        'free' => [
            'key' => 'free',
            'title' => 'User Member',
            'price' => 0,
            'badge' => 'Always Free',
            'can_post' => false,
            'max_active_ads' => 0,
            'featured_days' => 0,
            'top_ad_days' => 0,
            'storefront' => false,
            'features' => ['Browse listings', 'Save favorites', 'Receive notifications', 'Message businesses'],
        ],
        'plus' => [
            'key' => 'plus',
            'title' => 'User Member Plus',
            'price' => 10,
            'badge' => '1 Regular Ad',
            'can_post' => true,
            'max_active_ads' => 1,
            'featured_days' => 0,
            'top_ad_days' => 0,
            'storefront' => false,
            'features' => ['Post 1 regular ad/listing', 'Ad-free browsing', 'No featured/top placement'],
        ],
        'starter' => [
            'key' => 'starter',
            'title' => 'Starter Business',
            'price' => 25,
            'badge' => 'Starter',
            'can_post' => true,
            'max_active_ads' => 2,
            'featured_days' => 0,
            'top_ad_days' => 0,
            'storefront' => false,
            'features' => ['2 active regular ads', 'Basic business profile', 'Marketplace & directory visibility'],
        ],
        'growth' => [
            'key' => 'growth',
            'title' => 'Growth Business',
            'price' => 50,
            'badge' => 'Most Popular',
            'can_post' => true,
            'max_active_ads' => 3,
            'featured_days' => 14,
            'top_ad_days' => 7,
            'storefront' => false,
            'features' => ['Up to 3 active ads', '14 Featured days/month', '7 Top Ad days/month', 'Quarterly mentions'],
        ],
        'elite' => [
            'key' => 'elite',
            'title' => 'Elite Business',
            'price' => 150,
            'badge' => 'Done-For-You',
            'can_post' => true,
            'max_active_ads' => 5,
            'featured_days' => 30,
            'top_ad_days' => 15,
            'storefront' => false,
            'features' => ['Personal account manager', 'Up to 5 active ads', 'Managed visibility', 'Priority support'],
        ],
    ];
}

function ww_membership_trial_days(PDO $pdo): int
{
    $days = (int) ww_get_setting($pdo, 'membership_trial_days', '90');
    return max(0, min(365, $days));
}

function ww_valid_membership_plan(string $plan): string
{
    return array_key_exists($plan, ww_subscription_plans()) ? $plan : 'free';
}

/**
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function ww_subscription_payload(PDO $pdo, array $user): array
{
    $plans = ww_subscription_plans();
    $planKey = ww_valid_membership_plan((string) ($user['membership_plan'] ?? 'free'));
    $status = (string) ($user['subscription_status'] ?? 'free');
    $plan = $plans[$planKey];
    $paidAccess = $planKey !== 'free' && in_array($status, ['trialing', 'active', 'grace'], true);
    $features = $plan;
    $features['can_post'] = $paidAccess && !empty($plan['can_post']);

    return [
        'plan' => $planKey,
        'status' => $status,
        'plan_title' => (string) $plan['title'],
        'trial_ends_at' => $user['trial_ends_at'] ?? null,
        'grace_ends_at' => $user['grace_ends_at'] ?? null,
        'stripe_payment_method_status' => (string) ($user['stripe_payment_method_status'] ?? 'none'),
        'features' => $features,
        'plans' => array_values($plans),
        'trial_days' => ww_membership_trial_days($pdo),
    ];
}

/**
 * @param array<string, mixed> $user
 */
function ww_subscription_can_post(PDO $pdo, array $user): bool
{
    $payload = ww_subscription_payload($pdo, $user);
    return !empty($payload['features']['can_post']);
}

/**
 * @param array<string, mixed> $user
 */
function ww_subscription_require_posting(PDO $pdo, array $user): void
{
    if (!ww_subscription_can_post($pdo, $user)) {
        ww_json(['ok' => false, 'error' => 'Upgrade required to post listings or business content.'], 402);
    }
}

<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/admin/includes/settings_store.php';

/** When false (launch default), all verified users get full posting access with no plan limits. */
function ww_monetization_enabled(PDO $pdo): bool
{
    return (ww_get_setting($pdo, 'monetization_enabled', '0') ?? '0') === '1';
}

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

/** Business tiers that may purchase a storefront add-on. */
function ww_subscription_has_business_membership(string $planKey): bool
{
    $p = ww_valid_membership_plan($planKey);

    return in_array($p, ['starter', 'growth', 'elite'], true);
}

/** @return array<string, array{title: string, price_monthly: int, product_cap: int}> */
function ww_storefront_addon_catalog(): array
{
    return [
        'small' => ['title' => 'Small Storefront', 'price_monthly' => 25, 'product_cap' => 25],
        'large' => ['title' => 'Large Storefront', 'price_monthly' => 50, 'product_cap' => 50],
    ];
}

function ww_storefront_addon_valid(string $v): bool
{
    return in_array($v, ['none', 'small', 'large'], true);
}

function ww_storefront_product_cap(string $addon): int
{
    $cat = ww_storefront_addon_catalog();

    return (int) ($cat[$addon]['product_cap'] ?? 0);
}

function ww_subscription_count_marketplace_listings(PDO $pdo, int $userId): int
{
    $sql = "SELECT COUNT(*) FROM listings
            WHERE user_id = ?
              AND listing_type IN ('classified','service','community')
              AND moderation_status IN ('pending_approval','approved')";

    try {
        $st = $pdo->prepare($sql);
        $st->execute([$userId]);

        return (int) $st->fetchColumn();
    } catch (\Throwable) {
        return 0;
    }
}

/**
 * Block new marketplace listings when the member is at max_active_ads (approved + pending).
 *
 * @param array<string, mixed> $user
 */
function ww_subscription_enforce_listing_cap(PDO $pdo, array $user): void
{
    if (!ww_monetization_enabled($pdo)) {
        return;
    }
    $planKey = ww_valid_membership_plan((string) ($user['membership_plan'] ?? 'free'));
    $status = (string) ($user['subscription_status'] ?? 'free');
    $paidAccess = $planKey !== 'free' && in_array($status, ['trialing', 'active', 'grace'], true);
    if (!$paidAccess) {
        return;
    }
    $plans = ww_subscription_plans();
    $plan = $plans[$planKey];
    $limit = (int) ($plan['max_active_ads'] ?? 0);
    if ($limit <= 0) {
        return;
    }
    $used = ww_subscription_count_marketplace_listings($pdo, (int) $user['id']);
    if ($used >= $limit) {
        ww_json([
            'ok' => false,
            'error' => 'You are at your plan limit for active marketplace listings. Remove or wait for one to leave review before adding another.',
        ], 402);
    }
}

/**
 * @param array<string, mixed> $user
 * @return array<string, mixed>
 */
function ww_subscription_payload(PDO $pdo, array $user): array
{
    $monetization = ww_monetization_enabled($pdo);
    $plans = ww_subscription_plans();
    $planKey = ww_valid_membership_plan((string) ($user['membership_plan'] ?? 'free'));
    $status = (string) ($user['subscription_status'] ?? 'free');
    $plan = $plans[$planKey];
    $paidAccess = $planKey !== 'free' && in_array($status, ['trialing', 'active', 'grace'], true);
    $features = $plan;
    if ($monetization) {
        $features['can_post'] = $paidAccess && !empty($plan['can_post']);
    } else {
        $features['can_post'] = true;
    }

    $userId = (int) ($user['id'] ?? 0);
    $usedListings = ww_subscription_count_marketplace_listings($pdo, $userId);
    $limitAds = (int) ($plan['max_active_ads'] ?? 0);

    $addon = (string) ($user['storefront_addon'] ?? 'none');
    if (!ww_storefront_addon_valid($addon)) {
        $addon = 'none';
    }
    $addonCatalog = ww_storefront_addon_catalog();
    $addonMonthly = null;
    $addonTitle = null;
    if ($addon !== 'none' && isset($addonCatalog[$addon])) {
        $addonMonthly = (int) $addonCatalog[$addon]['price_monthly'];
        $addonTitle = (string) $addonCatalog[$addon]['title'];
    }

    $pmStatus = (string) ($user['stripe_payment_method_status'] ?? 'none');
    $paymentMethod = null;
    if ($monetization && $pmStatus === 'attached') {
        $l4 = trim((string) ($user['stripe_pm_last4'] ?? ''));
        $br = strtolower(trim((string) ($user['stripe_pm_brand'] ?? '')));
        $paymentMethod = [
            'brand' => $br !== '' ? $br : null,
            'last4' => $l4 !== '' ? $l4 : null,
        ];
    }

    $productCap = ww_storefront_product_cap($addon);
    if (!$monetization) {
        $productCap = 0;
    }

    return [
        'monetization_enabled' => $monetization,
        'plan' => $planKey,
        'status' => $status,
        'plan_title' => (string) $plan['title'],
        'trial_ends_at' => $user['trial_ends_at'] ?? null,
        'grace_ends_at' => $user['grace_ends_at'] ?? null,
        'stripe_payment_method_status' => $monetization ? $pmStatus : 'none',
        'payment_method' => $paymentMethod,
        'storefront_addon' => $addon,
        'storefront_addon_title' => $addonTitle,
        'storefront_addon_monthly' => $addonMonthly,
        'storefront_product_cap' => $productCap,
        'has_business_membership' => $monetization
            ? ww_subscription_has_business_membership($planKey)
            : true,
        'usage' => [
            'marketplace_listings_used' => $usedListings,
            'marketplace_listings_limit' => $monetization ? $limitAds : 0,
            'marketplace_listings_remaining' => $monetization ? max(0, $limitAds - $usedListings) : 0,
        ],
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
    if (!ww_monetization_enabled($pdo)) {
        return true;
    }
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

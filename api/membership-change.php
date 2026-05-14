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

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$body = ww_read_json();
$plan = ww_valid_membership_plan(strtolower(trim((string) ($body['membership_plan'] ?? 'free'))));
$userId = (int) $user['id'];
$trialDays = ww_membership_trial_days($pdo);
$now = date('Y-m-d H:i:s');

if ($plan === 'free') {
    $st = $pdo->prepare(
        'UPDATE users
         SET membership_plan = ?, subscription_status = ?, grace_ends_at = NULL, stripe_payment_method_status = ?, stripe_pm_last4 = NULL, stripe_pm_brand = NULL, storefront_addon = ?
         WHERE id = ?'
    );
    $st->execute(['free', 'free', 'none', 'none', $userId]);

    try {
        $pdo->prepare('UPDATE listings SET moderation_status = ? WHERE user_id = ? AND moderation_status = ?')
            ->execute(['pending_approval', $userId, 'approved']);
        $pdo->prepare('UPDATE stores SET moderation_status = ? WHERE user_id = ? AND moderation_status = ?')
            ->execute(['suspended', $userId, 'approved']);
        $pdo->prepare('UPDATE directory_entries SET moderation_status = ? WHERE user_id = ? AND moderation_status = ?')
            ->execute(['suspended', $userId, 'approved']);
    } catch (\Throwable) {
        // Downgrade still succeeds; moderation tables may not exist in old installs.
    }
} else {
    $existingTrialEnd = !empty($user['trial_ends_at']) ? (string) $user['trial_ends_at'] : null;
    $trialEnd = $existingTrialEnd ?: (new DateTimeImmutable())->modify('+' . $trialDays . ' days')->format('Y-m-d H:i:s');
    $status = in_array((string) ($user['subscription_status'] ?? ''), ['active', 'trialing', 'grace'], true)
        ? (string) $user['subscription_status']
        : 'trialing';
    $prevPm = (string) ($user['stripe_payment_method_status'] ?? 'none');
    $pmForPaid = $prevPm === 'attached' ? 'attached' : 'missing';
    $planBusiness = ww_subscription_has_business_membership($plan);
    $prevAddon = (string) ($user['storefront_addon'] ?? 'none');
    $addonVal = 'none';
    if ($planBusiness && ww_storefront_addon_valid($prevAddon) && in_array($prevAddon, ['small', 'large'], true)) {
        $addonVal = $prevAddon;
    }
    $clearPmCols = $pmForPaid === 'missing' ? ', stripe_pm_last4 = NULL, stripe_pm_brand = NULL' : '';
    $st = $pdo->prepare(
        'UPDATE users
         SET membership_plan = ?, subscription_status = ?, trial_started_at = COALESCE(trial_started_at, ?), trial_ends_at = ?, stripe_payment_method_status = ?, storefront_addon = ?' . $clearPmCols . '
         WHERE id = ?'
    );
    $st->execute([$plan, $status, $now, $trialEnd, $pmForPaid, $addonVal, $userId]);
}

$fresh = ww_user_from_token($pdo, $tok);
ww_json(['ok' => true, 'subscription' => ww_subscription_payload($pdo, $fresh ?: $user)]);

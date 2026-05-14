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
$addon = strtolower(trim((string) ($body['storefront_addon'] ?? '')));
if (!ww_storefront_addon_valid($addon)) {
    ww_json(['ok' => false, 'error' => 'storefront_addon must be none, small, or large'], 422);
}

if ($addon !== 'none') {
    if (!ww_subscription_can_post($pdo, $user)) {
        ww_json(['ok' => false, 'error' => 'An active paid membership is required for storefront add-ons.'], 402);
    }
    $planKey = ww_valid_membership_plan((string) ($user['membership_plan'] ?? 'free'));
    if (!ww_subscription_has_business_membership($planKey)) {
        ww_json(['ok' => false, 'error' => 'Storefront add-ons require Starter, Growth, or Elite.'], 402);
    }
}

$userId = (int) $user['id'];
$pdo->prepare('UPDATE users SET storefront_addon = ? WHERE id = ?')->execute([$addon, $userId]);

$fresh = ww_user_from_token($pdo, $tok);
ww_json(['ok' => true, 'subscription' => ww_subscription_payload($pdo, $fresh ?: $user)]);

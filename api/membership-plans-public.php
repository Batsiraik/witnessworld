<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/subscription_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$pdo = witnessworld_pdo();

ww_json([
    'ok' => true,
    'trial_days' => ww_membership_trial_days($pdo),
    'plans' => array_values(ww_subscription_plans()),
]);

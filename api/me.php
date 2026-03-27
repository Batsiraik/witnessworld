<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once dirname(__DIR__) . '/admin/includes/settings_store.php';
require_once __DIR__ . '/lib/support_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
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

$support = ww_get_setting($pdo, 'support_email', 'info@witnessworldconnect.com');
$supportUid = ww_support_user_id($pdo);

ww_json([
    'ok' => true,
    'user' => ww_user_public($user),
    'support_email' => $support,
    'support_available' => $supportUid > 0,
]);

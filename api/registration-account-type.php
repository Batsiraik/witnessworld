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

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$in = ww_read_json();
$raw = strtolower(trim((string) ($in['account_type'] ?? $in['registration_account_type'] ?? '')));
if (!in_array($raw, ['individual', 'business'], true)) {
    ww_json(['ok' => false, 'error' => 'Select Individual or Business'], 422);
}

$status = (string) ($user['status'] ?? '');
if ($status !== 'pending_verification') {
    ww_json(['ok' => false, 'error' => 'This step only applies while your account is pending verification'], 422);
}

$existing = (string) ($user['registration_account_type'] ?? '');
if ($existing !== '') {
    ww_json(['ok' => true, 'registration_account_type' => $existing]);
}

$up = $pdo->prepare('UPDATE users SET registration_account_type = ? WHERE id = ?');
$up->execute([$raw, (int) $user['id']]);

ww_json([
    'ok' => true,
    'registration_account_type' => $raw,
]);

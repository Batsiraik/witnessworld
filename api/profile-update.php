<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once dirname(__DIR__) . '/admin/includes/profile_edit.php';

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

$status = (string) ($user['status'] ?? '');
if (!in_array($status, ['verified', 'pending_verification', 'declined'], true)) {
    ww_json(['ok' => false, 'error' => 'Your account cannot update profile details right now'], 403);
}

$in = ww_read_json();
$validated = ww_profile_validate_fields($in, true);
if (!$validated['ok']) {
    ww_json(['ok' => false, 'error' => $validated['error'] ?? 'Invalid profile details'], 422);
}

$userId = (int) $user['id'];
$result = ww_profile_apply_update($pdo, $userId, $user, $validated['data'], true);
if (!$result['ok']) {
    ww_json(['ok' => false, 'error' => $result['error'] ?? 'Could not update profile'], 422);
}

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$userId]);
$fresh = $st->fetch(PDO::FETCH_ASSOC) ?: $user;

$out = [
    'ok' => true,
    'message' => !empty($result['reverify'])
        ? 'Profile updated. Your account needs admin verification again before you can continue.'
        : 'Profile updated.',
    'requires_reverification' => !empty($result['reverify']),
    'user' => ww_user_public($fresh),
];

ww_json($out);

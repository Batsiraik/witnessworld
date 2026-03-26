<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/profile_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$in = ww_read_json();
$confirmEmail = strtolower(trim((string) ($in['confirm_email'] ?? '')));
$confirmPhone = (string) ($in['confirm_phone'] ?? '');

if ($confirmEmail === '' || trim($confirmPhone) === '') {
    ww_json(['ok' => false, 'error' => 'Email and phone are required to confirm deletion'], 422);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$userId = (int) $user['id'];
$dbEmail = strtolower(trim((string) ($user['email'] ?? '')));
$dbPhoneNorm = ww_normalize_phone((string) ($user['phone'] ?? ''));
$inPhoneNorm = ww_normalize_phone($confirmPhone);

if ($confirmEmail !== $dbEmail) {
    ww_json(['ok' => false, 'error' => 'Email does not match your account'], 422);
}

if ($inPhoneNorm === '' || $inPhoneNorm !== $dbPhoneNorm) {
    ww_json(['ok' => false, 'error' => 'Phone number does not match your account'], 422);
}

$avatarUrl = $user['avatar_url'] ?? null;
ww_delete_local_avatar_file(is_string($avatarUrl) ? $avatarUrl : null);

$pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

ww_json(['ok' => true]);

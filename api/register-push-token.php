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

$body = ww_read_json();
$expoToken = trim((string) ($body['expo_push_token'] ?? ''));
$platform = strtolower(trim((string) ($body['platform'] ?? 'unknown')));
if ($expoToken === '' || strlen($expoToken) > 500) {
    ww_json(['ok' => false, 'error' => 'expo_push_token required'], 422);
}
if (!str_starts_with($expoToken, 'ExponentPushToken[')) {
    ww_json(['ok' => false, 'error' => 'Invalid Expo push token'], 422);
}

$userId = (int) $user['id'];

try {
    $pdo->prepare('DELETE FROM user_push_tokens WHERE expo_push_token = ?')->execute([$expoToken]);
    $ins = $pdo->prepare(
        'INSERT INTO user_push_tokens (user_id, expo_push_token, platform) VALUES (?,?,?)'
    );
    $ins->execute([$userId, $expoToken, $platform !== '' ? $platform : 'unknown']);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not save push token. Run database/revisions_user_push_tokens.sql.'], 500);
}

ww_json(['ok' => true]);

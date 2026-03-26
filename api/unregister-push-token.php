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

try {
    if ($expoToken !== '') {
        $pdo->prepare(
            'DELETE FROM user_push_tokens WHERE user_id = ? AND expo_push_token = ?'
        )->execute([(int) $user['id'], $expoToken]);
    } else {
        $pdo->prepare('DELETE FROM user_push_tokens WHERE user_id = ?')->execute([(int) $user['id']]);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not remove push token'], 500);
}

ww_json(['ok' => true]);

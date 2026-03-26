<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if ($tok) {
    $pdo = witnessworld_pdo();
    $user = ww_user_from_token($pdo, $tok);
    if ($user) {
        $pdo->prepare('DELETE FROM user_push_tokens WHERE user_id = ?')->execute([(int) $user['id']]);
    }
    $pdo->prepare('DELETE FROM user_api_tokens WHERE token = ?')->execute([$tok]);
}

ww_json(['ok' => true]);

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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

$subjectType = strtolower(trim((string) ($_GET['subject_type'] ?? '')));
$subjectId = (int) ($_GET['subject_id'] ?? 0);
if (!in_array($subjectType, ['listing', 'store', 'product', 'directory_entry'], true) || $subjectId <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid favorite target'], 422);
}

$st = $pdo->prepare('SELECT id FROM user_favorites WHERE user_id = ? AND subject_type = ? AND subject_id = ? LIMIT 1');
$st->execute([(int) $user['id'], $subjectType, $subjectId]);

ww_json(['ok' => true, 'favorited' => (bool) $st->fetchColumn()]);

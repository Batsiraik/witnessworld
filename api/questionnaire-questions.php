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

$status = (string) ($user['status'] ?? '');
if (!in_array($status, ['pending_questions'], true)) {
    ww_json([
        'ok' => true,
        'questions' => [],
        'message' => 'No questionnaire step for this account state.',
        'status' => $status,
    ]);
}

$q = $pdo->query(
    'SELECT id, question_text, sort_order FROM questionnaire_questions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
);
$rows = $q->fetchAll(PDO::FETCH_ASSOC);

ww_json(['ok' => true, 'questions' => $rows]);

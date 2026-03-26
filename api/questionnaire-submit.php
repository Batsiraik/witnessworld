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

if (($user['status'] ?? '') !== 'pending_questions') {
    ww_json(['ok' => false, 'error' => 'Questionnaire is not available for your account now.'], 409);
}

$in = ww_read_json();
$answers = $in['answers'] ?? null;
if (!is_array($answers) || $answers === []) {
    ww_json(['ok' => false, 'error' => 'answers array is required'], 422);
}

$req = $pdo->query(
    'SELECT id FROM questionnaire_questions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
);
$requiredIds = array_map('intval', array_column($req->fetchAll(PDO::FETCH_ASSOC), 'id'));
if ($requiredIds === []) {
    ww_json(['ok' => false, 'error' => 'No active questions configured. Ask an admin to add questions.'], 503);
}

$byQ = [];
foreach ($answers as $a) {
    if (!is_array($a)) {
        continue;
    }
    $qid = (int) ($a['question_id'] ?? 0);
    $text = trim((string) ($a['answer_text'] ?? ''));
    if ($qid > 0 && $text !== '') {
        $byQ[$qid] = $text;
    }
}

foreach ($requiredIds as $id) {
    if (!isset($byQ[$id]) || trim($byQ[$id]) === '') {
        ww_json(['ok' => false, 'error' => 'Please answer all questions.'], 422);
    }
}

$uid = (int) $user['id'];
$pdo->beginTransaction();
try {
    $pdo->prepare('DELETE FROM questionnaire_answers WHERE user_id = ?')->execute([$uid]);
    $ins = $pdo->prepare(
        'INSERT INTO questionnaire_answers (user_id, question_id, answer_text) VALUES (?,?,?)'
    );
    foreach ($requiredIds as $id) {
        $ins->execute([$uid, $id, $byQ[$id]]);
    }
    $pdo->prepare('UPDATE users SET status = ? WHERE id = ?')->execute(['pending_verification', $uid]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    ww_json(['ok' => false, 'error' => 'Could not save answers'], 500);
}

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$uid]);
$fresh = $st->fetch(PDO::FETCH_ASSOC);

ww_json([
    'ok' => true,
    'message' => 'Thank you. Your profile is waiting for admin verification.',
    'user' => ww_user_public($fresh ?: []),
]);

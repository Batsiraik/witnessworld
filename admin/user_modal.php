<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    http_response_code(400);
    echo '<p class="text-sm text-red-600 p-4">Invalid user.</p>';
    exit;
}

$pdo = witnessworld_pdo();

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$id]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    http_response_code(404);
    echo '<p class="text-sm text-red-600 p-4">User not found.</p>';
    exit;
}

$ans = $pdo->prepare(
    'SELECT q.question_text, a.answer_text FROM questionnaire_answers a
     INNER JOIN questionnaire_questions q ON q.id = a.question_id
     WHERE a.user_id = ? ORDER BY q.sort_order ASC, q.id ASC'
);
$ans->execute([$id]);
$answers = $ans->fetchAll(PDO::FETCH_ASSOC);

$support = ww_get_setting($pdo, 'support_email', 'info@witnessworldconnect.com');
$formReturn = 'users';
$showOpenFullPageLink = true;

header('Content-Type: text/html; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
?>
<div class="space-y-4">
  <div class="border-b border-slate-200 pb-4">
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Review user</p>
    <h3 class="mt-1 text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $user['first_name'] . ' ' . (string) $user['last_name'], ENT_QUOTES, 'UTF-8') ?></h3>
    <p class="text-sm text-slate-600">@<?= htmlspecialchars((string) $user['username'], ENT_QUOTES, 'UTF-8') ?> · <?= htmlspecialchars((string) $user['email'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-2 text-sm font-medium text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars((string) $user['status'], ENT_QUOTES, 'UTF-8') ?></span></p>
  </div>
  <?php require __DIR__ . '/partials/user_review_sections.php'; ?>
</div>

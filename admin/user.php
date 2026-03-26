<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';
require_once __DIR__ . '/includes/push_triggers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: users.php');
    exit;
}

$pdo = witnessworld_pdo();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $returnTo = (string) ($_POST['return'] ?? '');
    $st = $pdo->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
    $st->execute([$id]);
    $cur = $st->fetchColumn();
    if ($cur === 'pending_verification') {
        if ($action === 'approve') {
            $pdo->prepare("UPDATE users SET status = 'verified' WHERE id = ?")->execute([$id]);
            ww_admin_notify_account_review($pdo, $id, 'approve');
        } elseif ($action === 'decline') {
            $pdo->prepare("UPDATE users SET status = 'declined' WHERE id = ?")->execute([$id]);
            ww_admin_notify_account_review($pdo, $id, 'decline');
        }
    }
    if ($returnTo === 'users') {
        header('Location: users.php');
    } else {
        header('Location: user.php?id=' . $id);
    }
    exit;
}

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$id]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    header('Location: users.php');
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
$formReturn = '';
$showOpenFullPageLink = false;

$pageTitle = 'User #' . $id;
$activeNav = 'users';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="users.php" class="font-semibold text-brand hover:underline">← Users</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $user['first_name'] . ' ' . (string) $user['last_name'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">@<?= htmlspecialchars((string) $user['username'], ENT_QUOTES, 'UTF-8') ?> · <?= htmlspecialchars((string) $user['email'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div class="text-sm font-semibold text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars((string) $user['status'], ENT_QUOTES, 'UTF-8') ?></span></div>
  </div>

  <?php require __DIR__ . '/partials/user_review_sections.php'; ?>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

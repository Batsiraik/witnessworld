<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Questionnaire';
$activeNav = 'questionnaire';

$pdo = witnessworld_pdo();
$flash = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'add') {
        $text = trim((string) ($_POST['question_text'] ?? ''));
        if ($text !== '') {
            $max = (int) $pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM questionnaire_questions')->fetchColumn();
            $st = $pdo->prepare('INSERT INTO questionnaire_questions (question_text, sort_order, is_active) VALUES (?,?,1)');
            $st->execute([$text, $max + 1]);
            $flash = 'Question added.';
        }
    } elseif ($action === 'toggle' && isset($_POST['id'])) {
        $id = (int) $_POST['id'];
        $pdo->prepare('UPDATE questionnaire_questions SET is_active = 1 - is_active WHERE id = ?')->execute([$id]);
        $flash = 'Updated.';
    } elseif ($action === 'delete' && isset($_POST['id'])) {
        $id = (int) $_POST['id'];
        $pdo->prepare('DELETE FROM questionnaire_questions WHERE id = ?')->execute([$id]);
        $flash = 'Deleted.';
    } elseif ($action === 'save' && isset($_POST['id'], $_POST['question_text'])) {
        $id = (int) $_POST['id'];
        $text = trim((string) $_POST['question_text']);
        if ($text !== '') {
            $pdo->prepare('UPDATE questionnaire_questions SET question_text = ? WHERE id = ?')->execute([$text, $id]);
            $flash = 'Saved.';
        }
    }
}

$rows = $pdo->query('SELECT * FROM questionnaire_questions ORDER BY sort_order ASC, id ASC')->fetchAll(PDO::FETCH_ASSOC);

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="grid gap-6 lg:grid-cols-2">
  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h2 class="text-base font-semibold text-slate-900">Add question</h2>
    <p class="mt-1 text-sm text-slate-500">Active questions appear in the app after email verification.</p>
    <form method="post" class="mt-4 space-y-3">
      <input type="hidden" name="action" value="add" />
      <textarea name="question_text" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Question text" required></textarea>
      <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Add</button>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel lg:col-span-2">
    <h2 class="text-base font-semibold text-slate-900">Questions</h2>
    <div class="mt-4 space-y-4">
      <?php foreach ($rows as $r): ?>
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <form method="post" class="space-y-2">
            <input type="hidden" name="action" value="save" />
            <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
            <textarea name="question_text" rows="2" class="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><?= htmlspecialchars((string) $r['question_text'], ENT_QUOTES, 'UTF-8') ?></textarea>
            <div class="flex flex-wrap items-center gap-2">
              <button type="submit" class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
              <span class="text-xs <?= ((int) $r['is_active']) ? 'text-emerald-700' : 'text-slate-500' ?>">
                <?= ((int) $r['is_active']) ? 'Active' : 'Inactive' ?>
              </span>
            </div>
          </form>
          <div class="mt-2 flex flex-wrap gap-2">
            <form method="post">
              <input type="hidden" name="action" value="toggle" />
              <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
              <button type="submit" class="text-xs font-semibold text-brand hover:underline">Toggle active</button>
            </form>
            <form method="post" onsubmit="return confirm('Delete this question?');">
              <input type="hidden" name="action" value="delete" />
              <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
              <button type="submit" class="text-xs font-semibold text-red-600 hover:underline">Delete</button>
            </form>
          </div>
        </div>
      <?php endforeach; ?>
      <?php if ($rows === []): ?>
        <p class="text-sm text-slate-500">No questions yet.</p>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

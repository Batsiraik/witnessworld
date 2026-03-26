<?php
/** @var array<string,mixed> $user */
/** @var array<int,array{question_text:string,answer_text:string}> $answers */
/** @var string $support */
/** @var int $id */
/** @var string $formReturn '' = stay on user.php after POST; 'users' = back to users list */
/** @var bool $showOpenFullPageLink show link to user.php (modal context only) */
$formReturn = $formReturn ?? '';
$showOpenFullPageLink = $showOpenFullPageLink ?? false;
?>
<div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
  <h3 class="text-sm font-semibold text-slate-900">Profile</h3>
  <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
    <div><dt class="text-slate-500">Phone</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $user['phone'], ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Joined</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $user['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
  </dl>
</div>

<div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
  <h3 class="text-sm font-semibold text-slate-900">Questionnaire answers</h3>
  <?php if ($answers === []): ?>
    <p class="mt-3 text-sm text-slate-500">No answers submitted yet.</p>
  <?php else: ?>
    <ul class="mt-4 space-y-3 max-h-[40vh] overflow-y-auto pr-1">
      <?php foreach ($answers as $a): ?>
        <li class="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <p class="text-xs font-semibold uppercase tracking-wide text-slate-500"><?= htmlspecialchars((string) $a['question_text'], ENT_QUOTES, 'UTF-8') ?></p>
          <p class="mt-2 text-sm text-slate-800 whitespace-pre-wrap"><?= htmlspecialchars((string) $a['answer_text'], ENT_QUOTES, 'UTF-8') ?></p>
        </li>
      <?php endforeach; ?>
    </ul>
  <?php endif; ?>
</div>

<?php if (($user['status'] ?? '') === 'pending_verification'): ?>
  <div class="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-panel">
    <p class="text-sm font-semibold text-amber-900">This user is waiting for your decision.</p>
    <form method="post" action="user.php?id=<?= (int) $id ?>" class="mt-4 flex flex-wrap gap-3">
      <?php if ($formReturn !== ''): ?>
        <input type="hidden" name="return" value="<?= htmlspecialchars($formReturn, ENT_QUOTES, 'UTF-8') ?>" />
      <?php endif; ?>
      <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve</button>
      <button type="submit" name="action" value="decline" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Decline this user? They will see a message with support email: <?= htmlspecialchars($support, ENT_QUOTES, 'UTF-8') ?>.');">Decline</button>
    </form>
  </div>
<?php endif; ?>

<?php if ($showOpenFullPageLink): ?>
  <p class="text-center text-xs text-slate-500">
    <a class="font-semibold text-brand hover:underline" href="user.php?id=<?= (int) $id ?>" target="_blank" rel="noopener">Open full page</a>
  </p>
<?php endif; ?>

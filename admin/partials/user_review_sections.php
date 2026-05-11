<?php
/** @var array<string,mixed> $user */
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
    <div><dt class="text-slate-500">Date of birth</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['date_of_birth'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">I am a</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['member_type'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Baptism date</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['baptism_date'] ?? 'Not provided'), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Congregation</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['congregation'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Joined</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $user['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
  </dl>
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

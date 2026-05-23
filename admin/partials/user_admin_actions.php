<?php
/** @var array<string,mixed> $user */
/** @var int $id */
/** @var string $formReturn */
/** @var PDO $pdo */
$pdo = $pdo ?? witnessworld_pdo();
$canSuspend = ww_admin_can_suspend_user($user);
$canDelete = ww_admin_can_delete_user($pdo, $user);
$isProtected = ww_admin_user_is_protected($pdo, $id);
$displayName = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
if ($displayName === '') {
    $displayName = (string) ($user['email'] ?? 'User #' . $id);
}
$returnAttr = htmlspecialchars($formReturn, ENT_QUOTES, 'UTF-8');
$nameAttr = htmlspecialchars($displayName, ENT_QUOTES, 'UTF-8');
?>
<?php if ($canSuspend || $canDelete || $isProtected): ?>
<div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
  <h3 class="text-sm font-semibold text-slate-900">Account controls</h3>
  <p class="mt-1 text-xs text-slate-500">Suspend sends the member back to pending verification. Delete permanently removes their account.</p>
  <?php if ($isProtected): ?>
    <p class="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
      This account is the configured Customer Support user and cannot be deleted.
    </p>
  <?php endif; ?>
  <div class="mt-4 flex flex-wrap gap-2">
    <?php if ($canSuspend): ?>
      <button
        type="button"
        class="admin-btn admin-btn--warning admin-btn--sm js-admin-user-suspend"
        data-user-id="<?= (int) $id ?>"
        data-user-name="<?= $nameAttr ?>"
        data-return="<?= $returnAttr ?>"
      >Suspend user</button>
    <?php endif; ?>
    <?php if ($canDelete): ?>
      <button
        type="button"
        class="admin-btn admin-btn--danger admin-btn--sm js-admin-user-delete"
        data-user-id="<?= (int) $id ?>"
        data-user-name="<?= $nameAttr ?>"
        data-return="<?= $returnAttr ?>"
      >Delete user</button>
    <?php endif; ?>
  </div>
</div>
<?php endif; ?>

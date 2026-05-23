<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Businesses';
$activeNav = 'businesses';

$pdo = witnessworld_pdo();

$sql = "SELECT id, email, username, first_name, last_name, phone, status, registration_account_type,
        registration_country_name, congregation, created_at
        FROM users
        WHERE registration_account_type = 'business'
        ORDER BY id DESC";
$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$userHref = static function (int $id) use ($base): string {
    $p = ($base === '' || $base === '.') ? 'user.php' : $base . '/user.php';

    return $p . '?id=' . $id;
};
$userPhp = ($base === '' || $base === '.') ? 'user.php' : $base . '/user.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if (isset($_GET['suspended']) && $_GET['suspended'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">User suspended — they are now pending verification and have been signed out of the app.</div>
<?php endif; ?>
<?php if (isset($_GET['deleted']) && $_GET['deleted'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">User account deleted permanently.</div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4">
    <h2 class="text-base font-semibold text-slate-900">Business signups</h2>
    <p class="mt-1 text-sm text-slate-500">
      Members who chose <strong>Business</strong> on the verification poll — use this list for future marketing campaigns.
    </p>
    <p class="mt-2 text-xs text-slate-500"><?= count($rows) ?> user(s)</p>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">User</th>
          <th class="px-6 py-3">Email</th>
          <th class="px-6 py-3">Country</th>
          <th class="px-6 py-3">Congregation</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Joined</th>
          <th class="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <?php
            $uid = (int) $r['id'];
            $rowUser = $r;
            $rowUser['id'] = $uid;
            $rowName = trim((string) $r['first_name'] . ' ' . (string) $r['last_name']);
            if ($rowName === '') {
                $rowName = (string) $r['email'];
            }
            $rowCanSuspend = ww_admin_can_suspend_user($rowUser);
            $rowCanDelete = ww_admin_can_delete_user($pdo, $rowUser);
          ?>
          <tr class="bg-white hover:bg-brand-muted/20"<?= ww_admin_row_attrs((string) $r['status']) ?>>
            <td class="px-6 py-4 font-medium text-slate-900">
              <?= htmlspecialchars((string) $r['first_name'] . ' ' . (string) $r['last_name'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs font-normal text-slate-500">@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['email'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) ($r['registration_country_name'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) ($r['congregation'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4"><?= ww_admin_status_badge((string) $r['status']) ?></td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <?= ww_admin_btn_link($userHref($uid), 'View', 'primary', ['class' => 'admin-btn--sm']) ?>
                <?php if ($rowCanSuspend): ?>
                  <button type="button" class="admin-btn admin-btn--warning admin-btn--sm js-admin-user-suspend" data-user-id="<?= $uid ?>" data-user-name="<?= htmlspecialchars($rowName, ENT_QUOTES, 'UTF-8') ?>" data-return="businesses">Suspend</button>
                <?php endif; ?>
                <?php if ($rowCanDelete): ?>
                  <button type="button" class="admin-btn admin-btn--danger admin-btn--sm js-admin-user-delete" data-user-id="<?= $uid ?>" data-user-name="<?= htmlspecialchars($rowName, ENT_QUOTES, 'UTF-8') ?>" data-return="businesses">Delete</button>
                <?php endif; ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="7" class="px-6 py-8 text-center text-slate-500">No business signups yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php
$confirmModalUserPhp = $userPhp;
require __DIR__ . '/partials/user_confirm_modal.php';
?>
<script src="<?= htmlspecialchars(($base === '' || $base === '.' ? '' : $base) . '/assets/admin-user-actions.js', ENT_QUOTES, 'UTF-8') ?>"></script>
<script>
(function () {
  var m = document.getElementById('admin-user-confirm-modal');
  if (m) m.setAttribute('data-user-php-base', <?= json_encode($userPhp, JSON_THROW_ON_ERROR) ?>);
})();
</script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/../api/lib/directory_helpers.php';

$pageTitle = 'Business directory';
$activeNav = 'directory';

$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = ['all', 'pending_approval', 'approved', 'rejected', 'suspended'];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$sql = 'SELECT d.id, d.business_name, d.city, d.category, d.moderation_status, d.created_at,
        d.location_country_name, d.location_us_state,
        u.email AS user_email, u.username, u.first_name, u.last_name,
        dc.name AS category_name
        FROM directory_entries d
        INNER JOIN users u ON u.id = d.user_id
        LEFT JOIN directory_categories dc ON dc.id = d.category_id';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE d.moderation_status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY d.id DESC';

$rows = [];
$dbError = null;
try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $dbError = 'Directory table missing. See database/README.md.';
}

$cats = ww_directory_categories();

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'directory.php' : $base . '/directory.php';

$chipTones = [
    'all' => 'brand',
    'pending_approval' => 'warning',
    'approved' => 'success',
    'rejected' => 'neutral',
    'suspended' => 'danger',
];
$chip = static function (string $key, string $label, string $cur) use ($self, $chipTones): string {
    $qs = $key === 'all' ? '' : ('?status=' . urlencode($key));
    $tone = $chipTones[$key] ?? 'brand';

    return ww_admin_filter_chip($self . $qs, $label, $cur === $key, $tone);
};

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($dbError !== null): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($dbError, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<?php if (isset($_GET['moderated']) && $_GET['moderated'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-medium">Directory listing updated.</div>
<?php endif; ?>
<?php if (isset($_GET['suspended']) && $_GET['suspended'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Directory listing suspended.</div>
<?php endif; ?>
<?php if (isset($_GET['deleted']) && $_GET['deleted'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Directory listing deleted permanently.</div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Business directory</h2>
      <p class="text-sm text-slate-500">Approve public business profiles. Owners may add several listings per account.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $chip('all', 'All', $filter) ?>
      <?= $chip('pending_approval', 'Pending', $filter) ?>
      <?= $chip('approved', 'Approved', $filter) ?>
      <?= $chip('rejected', 'Rejected', $filter) ?>
      <?= $chip('suspended', 'Suspended', $filter) ?>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Business</th>
          <th class="px-6 py-3">Owner</th>
          <th class="px-6 py-3">Location</th>
          <th class="px-6 py-3">Category</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Created</th>
          <th class="px-6 py-3">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <?php
            $did = (int) $r['id'];
            $detail = ($base === '' || $base === '.') ? 'directory_entry.php?id=' . $did : $base . '/directory_entry.php?id=' . $did;
            $loc = htmlspecialchars((string) $r['location_country_name'], ENT_QUOTES, 'UTF-8');
            if (!empty($r['location_us_state'])) {
                $loc .= ' · ' . htmlspecialchars((string) $r['location_us_state'], ENT_QUOTES, 'UTF-8');
            }
            $loc .= ' · ' . htmlspecialchars((string) $r['city'], ENT_QUOTES, 'UTF-8');
            $catLabel = !empty($r['category_name'])
                ? htmlspecialchars((string) $r['category_name'], ENT_QUOTES, 'UTF-8')
                : htmlspecialchars($cats[(string) ($r['category'] ?? '')] ?? (string) ($r['category'] ?? ''), ENT_QUOTES, 'UTF-8');
          ?>
          <tr class="bg-white hover:bg-slate-50/80"<?= ww_admin_row_attrs((string) ($r['moderation_status'] ?? '')) ?>>
            <td class="px-6 py-4">
              <a href="<?= htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand hover:underline"><?= htmlspecialchars((string) $r['business_name'], ENT_QUOTES, 'UTF-8') ?></a>
            </td>
            <td class="px-6 py-4 text-slate-700">
              <?= htmlspecialchars(trim((string) $r['first_name'] . ' ' . (string) $r['last_name']), ENT_QUOTES, 'UTF-8') ?>
              <span class="text-slate-500">(@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
              <div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['user_email'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-700"><?= $loc ?></td>
            <td class="px-6 py-4 text-slate-700"><?= $catLabel ?></td>
            <td class="px-6 py-4"><?= ww_admin_status_badge((string) ($r['moderation_status'] ?? '')) ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <?= ww_admin_btn_link($detail, 'Review', 'primary', ['class' => 'admin-btn--sm']) ?>
                <?php
                  $entityType = 'directory';
                  $entityId = $did;
                  $row = $r;
                  $return = 'list';
                  require __DIR__ . '/partials/content_list_action_buttons.php';
                ?>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === [] && $dbError === null): ?>
          <tr><td colspan="7" class="px-6 py-10 text-center text-slate-500">No listings match this filter.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/partials/content_confirm_scripts.php'; ?>
<?php require __DIR__ . '/partials/shell_close.php'; ?>

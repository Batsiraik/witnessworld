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
        u.email AS user_email, u.username, u.first_name, u.last_name
        FROM directory_entries d
        INNER JOIN users u ON u.id = d.user_id';
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

function ww_dir_status_badge(string $s): string
{
    $map = [
        'pending_approval' => 'bg-amber-50 text-amber-900 ring-amber-600/20',
        'approved' => 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
        'rejected' => 'bg-slate-100 text-slate-700 ring-slate-600/10',
        'suspended' => 'bg-red-50 text-red-800 ring-red-600/20',
    ];
    $c = $map[$s] ?? 'bg-slate-100 text-slate-700';
    $label = str_replace('_', ' ', $s);

    return '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' . $c . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span>';
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'directory.php' : $base . '/directory.php';

$chip = static function (string $key, string $label, string $cur) use ($self): string {
    $qs = $key === 'all' ? '' : ('?status=' . urlencode($key));
    $active = $cur === $key;
    $cls = $active
        ? 'border-brand bg-brand/10 text-brand-dark ring-1 ring-brand/30'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';

    return '<a href="' . htmlspecialchars($self . $qs, ENT_QUOTES, 'UTF-8') . '" class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ' . $cls . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
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
            $catSlug = (string) ($r['category'] ?? '');
            $catLabel = htmlspecialchars($cats[$catSlug] ?? $catSlug, ENT_QUOTES, 'UTF-8');
          ?>
          <tr class="bg-white hover:bg-slate-50/80">
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
            <td class="px-6 py-4"><?= ww_dir_status_badge((string) ($r['moderation_status'] ?? '')) ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <a href="<?= htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand hover:underline">Review</a>
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

<?php require __DIR__ . '/partials/shell_close.php'; ?>

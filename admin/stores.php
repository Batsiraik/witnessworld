<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Online stores';
$activeNav = 'stores';

$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = ['all', 'pending_approval', 'approved', 'rejected', 'suspended'];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$sql = 'SELECT s.id, s.name, s.moderation_status, s.delivery_type, s.location_country_name, s.location_us_state,
        s.created_at, u.email AS user_email, u.first_name, u.last_name, u.username
        FROM stores s
        INNER JOIN users u ON u.id = s.user_id';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE s.moderation_status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY s.id DESC';

$rows = [];
$dbError = null;
try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $dbError = 'Store tables are missing. See database/README.md.';
}

function ww_store_status_badge(string $s): string
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
$self = ($base === '' || $base === '.') ? 'stores.php' : $base . '/stores.php';

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

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Online stores</h2>
      <p class="text-sm text-slate-500">Approve new storefronts before sellers can add products. Suspend a store to block product management without deleting data.</p>
      <p class="text-sm text-slate-700"><span class="font-semibold text-slate-900">How to approve:</span> use the <span class="font-semibold">Moderate</span> link or the store name to open the full page, scroll to the <span class="font-semibold">Moderation</span> section at the bottom, then click <span class="font-semibold text-emerald-800">Approve store</span>.</p>
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
          <th class="px-6 py-3">Store</th>
          <th class="px-6 py-3">Owner</th>
          <th class="px-6 py-3">Location</th>
          <th class="px-6 py-3">Delivery</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Created</th>
          <th class="px-6 py-3">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <?php
            $sid = (int) $r['id'];
            $detail = ($base === '' || $base === '.') ? 'store.php?id=' . $sid : $base . '/store.php?id=' . $sid;
            $loc = trim((string) ($r['location_country_name'] ?? ''));
            $stt = trim((string) ($r['location_us_state'] ?? ''));
            if ($stt !== '') {
                $loc .= ($loc !== '' ? ' · ' : '') . $stt;
            }
            $del = str_replace('_', ' ', (string) ($r['delivery_type'] ?? ''));
          ?>
          <tr class="bg-white hover:bg-slate-50/80">
            <td class="px-6 py-4">
              <a href="<?= htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand hover:underline"><?= htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8') ?></a>
            </td>
            <td class="px-6 py-4 text-slate-700">
              <?= htmlspecialchars(trim((string) $r['first_name'] . ' ' . (string) $r['last_name']), ENT_QUOTES, 'UTF-8') ?>
              <span class="text-slate-500">(@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
              <div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['user_email'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-700"><?= $loc !== '' ? htmlspecialchars($loc, ENT_QUOTES, 'UTF-8') : '—' ?></td>
            <td class="px-6 py-4 text-slate-700"><?= htmlspecialchars($del, ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4"><?= ww_store_status_badge((string) ($r['moderation_status'] ?? '')) ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <a href="<?= htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand hover:underline">Moderate</a>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === [] && $dbError === null): ?>
          <tr><td colspan="7" class="px-6 py-10 text-center text-slate-500">No stores match this filter.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

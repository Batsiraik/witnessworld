<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Commerce requests';
$activeNav = 'commerce_requests';
$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = ['all', 'new', 'accepted', 'in_progress', 'ready', 'shipped', 'delivered', 'completed', 'disputed', 'declined', 'cancelled'];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$rows = [];
$err = null;
try {
    $sql = 'SELECT r.*,
                   bu.username AS buyer_username, bu.email AS buyer_email_account,
                   su.username AS seller_username, su.email AS seller_email_account
            FROM commerce_requests r
            INNER JOIN users bu ON bu.id = r.buyer_user_id
            INNER JOIN users su ON su.id = r.seller_user_id';
    $params = [];
    if ($filter !== 'all') {
        $sql .= ' WHERE r.status = ?';
        $params[] = $filter;
    }
    $sql .= ' ORDER BY r.updated_at DESC, r.id DESC LIMIT 300';
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $err = 'Commerce request tables are missing or out of date. Run database/revisions.sql.';
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'commerce_requests.php' : $base . '/commerce_requests.php';
$chip = static function (string $key, string $label, string $cur) use ($self): string {
    $qs = $key === 'all' ? '' : ('?status=' . urlencode($key));
    $active = $cur === $key;
    $cls = $active ? 'border-brand bg-brand/10 text-brand-dark ring-1 ring-brand/30' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';
    return '<a href="' . htmlspecialchars($self . $qs, ENT_QUOTES, 'UTF-8') . '" class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ' . $cls . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
};

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($err !== null): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($err, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Commerce requests</h2>
      <p class="text-sm text-slate-500">Buyer requests, seller actions, shipping details, and disputes across products, services, local listings, and directory businesses.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $chip('all', 'All', $filter) ?>
      <?= $chip('new', 'New', $filter) ?>
      <?= $chip('accepted', 'Accepted', $filter) ?>
      <?= $chip('shipped', 'Shipped', $filter) ?>
      <?= $chip('completed', 'Completed', $filter) ?>
      <?= $chip('disputed', 'Disputed', $filter) ?>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Request</th>
          <th class="px-6 py-3">Buyer</th>
          <th class="px-6 py-3">Seller</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Shipping / Details</th>
          <th class="px-6 py-3">Updated</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <?php
            $ship = array_filter([
                (string) ($r['shipping_address1'] ?? ''),
                (string) ($r['shipping_address2'] ?? ''),
                (string) ($r['shipping_city'] ?? ''),
                (string) ($r['shipping_state'] ?? ''),
                (string) ($r['shipping_postal_code'] ?? ''),
                (string) ($r['shipping_country'] ?? ''),
            ]);
          ?>
          <tr class="bg-white align-top hover:bg-brand-muted/20">
            <td class="px-6 py-4">
              <div class="font-semibold text-slate-900"><?= htmlspecialchars((string) $r['subject_title'], ENT_QUOTES, 'UTF-8') ?></div>
              <div class="text-xs text-slate-500">#<?= (int) $r['id'] ?> · <?= htmlspecialchars((string) $r['request_type'], ENT_QUOTES, 'UTF-8') ?></div>
              <?php if (!empty($r['unit_price'])): ?>
                <div class="mt-1 text-xs text-slate-600"><?= htmlspecialchars((string) $r['currency'], ENT_QUOTES, 'UTF-8') ?> <?= htmlspecialchars((string) $r['unit_price'], ENT_QUOTES, 'UTF-8') ?> × <?= (int) $r['quantity'] ?></div>
              <?php endif; ?>
            </td>
            <td class="px-6 py-4 text-slate-600">
              <?= htmlspecialchars((string) $r['buyer_name'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs text-slate-500">@<?= htmlspecialchars((string) $r['buyer_username'], ENT_QUOTES, 'UTF-8') ?></div>
              <?php if (!empty($r['buyer_email'])): ?><div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['buyer_email'], ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
              <?php if (!empty($r['buyer_phone'])): ?><div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['buyer_phone'], ENT_QUOTES, 'UTF-8') ?></div><?php endif; ?>
            </td>
            <td class="px-6 py-4 text-slate-600">
              @<?= htmlspecialchars((string) $r['seller_username'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['seller_email_account'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4">
              <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200"><?= htmlspecialchars(str_replace('_', ' ', (string) $r['status']), ENT_QUOTES, 'UTF-8') ?></span>
            </td>
            <td class="max-w-sm px-6 py-4 text-slate-600">
              <?php if ($ship !== []): ?>
                <div class="text-xs font-semibold text-slate-500">Ship to <?= htmlspecialchars((string) ($r['shipping_name'] ?? $r['buyer_name']), ENT_QUOTES, 'UTF-8') ?></div>
                <div><?= htmlspecialchars(implode(', ', $ship), ENT_QUOTES, 'UTF-8') ?></div>
              <?php endif; ?>
              <?php if (!empty($r['project_brief'])): ?>
                <div class="mt-2 whitespace-pre-wrap"><?= htmlspecialchars((string) $r['project_brief'], ENT_QUOTES, 'UTF-8') ?></div>
              <?php endif; ?>
              <?php if (!empty($r['tracking_number'])): ?>
                <div class="mt-2 text-xs font-semibold text-slate-700">Tracking: <?= htmlspecialchars((string) $r['tracking_number'], ENT_QUOTES, 'UTF-8') ?></div>
              <?php endif; ?>
            </td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['updated_at'], ENT_QUOTES, 'UTF-8') ?></td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No requests in this filter.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Store products';
$activeNav = 'store_products';

$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = ['all', 'pending_approval', 'approved', 'rejected', 'removed'];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$sql = 'SELECT p.id, p.name, p.price_amount, p.currency, p.moderation_status, p.created_at,
        p.description, p.specifications, p.image_url, p.admin_note,
        s.id AS store_id, s.name AS store_name,
        u.email AS user_email, u.username, u.first_name, u.last_name
        FROM store_products p
        INNER JOIN stores s ON s.id = p.store_id
        INNER JOIN users u ON u.id = s.user_id';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE p.moderation_status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY p.id DESC';

$rows = [];
$dbError = null;
try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $dbError = 'Store product tables are missing. See database/README.md.';
}

$modalPayload = [];
foreach ($rows as $r) {
    $modalPayload[] = [
        'id' => (int) $r['id'],
        'name' => (string) $r['name'],
        'price_amount' => (string) $r['price_amount'],
        'currency' => (string) ($r['currency'] ?? 'USD'),
        'moderation_status' => (string) ($r['moderation_status'] ?? ''),
        'created_at' => (string) ($r['created_at'] ?? ''),
        'description' => (string) ($r['description'] ?? ''),
        'specifications' => (string) ($r['specifications'] ?? ''),
        'image_url' => (string) ($r['image_url'] ?? ''),
        'admin_note' => (string) ($r['admin_note'] ?? ''),
        'store_id' => (int) $r['store_id'],
        'store_name' => (string) $r['store_name'],
        'seller_email' => (string) $r['user_email'],
        'seller_username' => (string) $r['username'],
        'seller_name' => trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? '')),
    ];
}

try {
    $modalJson = json_encode(
        $modalPayload,
        JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    );
} catch (Throwable) {
    $modalJson = '[]';
}

function ww_product_status_badge(string $s): string
{
    $map = [
        'pending_approval' => 'bg-amber-50 text-amber-900 ring-amber-600/20',
        'approved' => 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
        'rejected' => 'bg-slate-100 text-slate-700 ring-slate-600/10',
        'removed' => 'bg-red-50 text-red-800 ring-red-600/20',
    ];
    $c = $map[$s] ?? 'bg-slate-100 text-slate-700';
    $label = str_replace('_', ' ', $s);

    return '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' . $c . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</span>';
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'store_products.php' : $base . '/store_products.php';

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
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 font-medium">
    Product updated. The list is refreshed below.
  </div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Store products</h2>
      <p class="text-sm text-slate-500">New and edited products require approval. Pending items use <span class="font-semibold text-slate-700">Review & approve</span> to open the detail panel; approved items use <span class="font-semibold text-slate-700">View</span>.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $chip('all', 'All', $filter) ?>
      <?= $chip('pending_approval', 'Pending', $filter) ?>
      <?= $chip('approved', 'Approved', $filter) ?>
      <?= $chip('rejected', 'Rejected', $filter) ?>
      <?= $chip('removed', 'Removed', $filter) ?>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Product</th>
          <th class="px-6 py-3">Store</th>
          <th class="px-6 py-3">Seller</th>
          <th class="px-6 py-3">Price</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Created</th>
          <th class="px-6 py-3">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <?php
            $pid = (int) $r['id'];
            $detail = ($base === '' || $base === '.') ? 'store_product.php?id=' . $pid : $base . '/store_product.php?id=' . $pid;
            $price = ($r['currency'] ?? 'USD') . ' ' . number_format((float) ($r['price_amount'] ?? 0), 2);
            $st = (string) ($r['moderation_status'] ?? '');
            $isPending = ($st === 'pending_approval' || $st === 'rejected');
            $btnLabel = $isPending ? 'Review & approve' : 'View';
            $btnClass = $isPending
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50';
          ?>
          <tr class="bg-white hover:bg-slate-50/80">
            <td class="px-6 py-4 font-semibold text-slate-900"><?= htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-700"><?= htmlspecialchars((string) $r['store_name'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-700">
              @<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs text-slate-500"><?= htmlspecialchars((string) $r['user_email'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-700"><?= htmlspecialchars($price, ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4"><?= ww_product_status_badge($st) ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 whitespace-nowrap">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  class="ww-product-modal-open inline-flex rounded-xl px-3.5 py-2 text-xs font-bold <?= htmlspecialchars($btnClass, ENT_QUOTES, 'UTF-8') ?>"
                  data-product-id="<?= $pid ?>"
                ><?= htmlspecialchars($btnLabel, ENT_QUOTES, 'UTF-8') ?></button>
                <a href="<?= htmlspecialchars($detail, ENT_QUOTES, 'UTF-8') ?>" class="text-xs font-semibold text-slate-500 hover:text-brand hover:underline">Full page</a>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === [] && $dbError === null): ?>
          <tr><td colspan="7" class="px-6 py-10 text-center text-slate-500">No products match this filter.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<!-- Product review modal -->
<div id="ww-product-modal" class="hidden fixed inset-0 z-[100] flex items-center justify-center p-4" aria-hidden="true">
  <button type="button" class="ww-product-modal-backdrop absolute inset-0 bg-slate-900/50" aria-label="Close panel"></button>
  <div class="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
    <div class="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
      <div class="min-w-0">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Store product</p>
        <h3 id="ww-modal-title" class="mt-1 text-lg font-semibold text-slate-900 truncate"></h3>
        <p id="ww-modal-meta" class="mt-1 text-sm text-slate-600"></p>
        <p id="ww-modal-status" class="mt-2"></p>
      </div>
      <button type="button" class="ww-product-modal-close rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close">
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
    <div class="flex-1 overflow-y-auto px-6 py-4 space-y-4">
      <div id="ww-modal-image-wrap" class="hidden rounded-xl border border-slate-100 bg-slate-50 p-2">
        <a id="ww-modal-image-link" href="#" target="_blank" rel="noopener" class="block">
          <img id="ww-modal-image" src="" alt="" class="mx-auto max-h-64 rounded-lg object-contain" />
        </a>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase text-slate-500">Store</p>
        <p id="ww-modal-store" class="mt-1 text-sm font-medium text-slate-900"></p>
        <a id="ww-modal-store-link" href="#" class="mt-1 inline-block text-sm font-semibold text-brand hover:underline">Open store moderation</a>
      </div>
      <div>
        <p class="text-xs font-semibold uppercase text-slate-500">Seller</p>
        <p id="ww-modal-seller" class="mt-1 text-sm text-slate-800"></p>
      </div>
      <div id="ww-modal-description-block" class="hidden">
        <p class="text-xs font-semibold uppercase text-slate-500">Description</p>
        <p id="ww-modal-description" class="mt-1 whitespace-pre-wrap text-sm text-slate-800"></p>
      </div>
      <div id="ww-modal-specs-block" class="hidden">
        <p class="text-xs font-semibold uppercase text-slate-500">Specifications</p>
        <p id="ww-modal-specs" class="mt-1 whitespace-pre-wrap text-sm text-slate-800"></p>
      </div>
      <div id="ww-modal-admin-note-block" class="hidden rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <p class="text-xs font-semibold uppercase text-amber-900">Previous admin note</p>
        <p id="ww-modal-admin-note" class="mt-1 whitespace-pre-wrap text-sm text-amber-950"></p>
      </div>
    </div>
    <div class="border-t border-slate-100 bg-slate-50/80 px-6 py-4">
      <div id="ww-modal-footer-pending" class="hidden space-y-4">
        <p class="text-sm font-medium text-slate-800">Approve after you have reviewed the details above.</p>
        <form id="ww-modal-moderate-form" method="post" action="" class="space-y-3">
          <input type="hidden" name="return_to" value="list" />
          <div>
            <label class="block text-xs font-semibold text-slate-600" for="ww-modal-admin-note-input">Note (optional for approve; recommended for reject / remove)</label>
            <textarea id="ww-modal-admin-note-input" name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          <div class="flex flex-wrap gap-3">
            <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve product</button>
            <button type="submit" name="action" value="reject" class="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Reject</button>
            <button type="submit" name="action" value="remove" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Remove this product from the storefront?');">Remove</button>
          </div>
        </form>
      </div>
      <div id="ww-modal-footer-approved" class="hidden space-y-3">
        <p class="text-sm text-slate-600">This product is live. Use the full page if you need to remove or reject it.</p>
        <a id="ww-modal-full-page" href="#" class="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Open full moderation page</a>
      </div>
      <div id="ww-modal-footer-removed" class="hidden space-y-3">
        <p class="text-sm text-slate-600">Use the full page to reopen this product as pending if needed.</p>
        <a id="ww-modal-full-page-removed" href="#" class="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Open full moderation page</a>
      </div>
      <div class="mt-4 flex justify-end">
        <button type="button" class="ww-product-modal-close rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Close</button>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  const products = <?= $modalJson ?>;
  const modal = document.getElementById('ww-product-modal');
  if (!modal || !Array.isArray(products)) return;

  function statusBadgeHtml(status) {
    const labels = {
      pending_approval: { t: 'pending approval', c: 'bg-amber-50 text-amber-900 ring-amber-600/20' },
      approved: { t: 'approved', c: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20' },
      rejected: { t: 'rejected', c: 'bg-slate-100 text-slate-700 ring-slate-600/10' },
      removed: { t: 'removed', c: 'bg-red-50 text-red-800 ring-red-600/20' },
    };
    const x = labels[status] || { t: status.replace(/_/g, ' '), c: 'bg-slate-100 text-slate-700' };
    return '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' + x.c + '">' + x.t.replace(/</g, '&lt;') + '</span>';
  }

  function openModal(id) {
    const p = products.find(function (x) { return x.id === id; });
    if (!p) return;

    document.getElementById('ww-modal-title').textContent = p.name;
    document.getElementById('ww-modal-meta').textContent = '#' + p.id + ' · ' + p.currency + ' ' + parseFloat(p.price_amount).toFixed(2) + ' · ' + p.created_at;
    document.getElementById('ww-modal-status').innerHTML = statusBadgeHtml(p.moderation_status);

    const imgWrap = document.getElementById('ww-modal-image-wrap');
    const img = document.getElementById('ww-modal-image');
    const imgLink = document.getElementById('ww-modal-image-link');
    if (p.image_url) {
      img.src = p.image_url;
      imgLink.href = p.image_url;
      imgWrap.classList.remove('hidden');
    } else {
      imgWrap.classList.add('hidden');
    }

    document.getElementById('ww-modal-store').textContent = p.store_name;
    const storeLink = document.getElementById('ww-modal-store-link');
    storeLink.href = 'store.php?id=' + encodeURIComponent(p.store_id);

    const sellerLine = (p.seller_name || '').trim() + ' (@' + p.seller_username + ') · ' + p.seller_email;
    document.getElementById('ww-modal-seller').textContent = sellerLine.trim();

    const descBlock = document.getElementById('ww-modal-description-block');
    if (p.description) {
      document.getElementById('ww-modal-description').textContent = p.description;
      descBlock.classList.remove('hidden');
    } else {
      descBlock.classList.add('hidden');
    }

    const specsBlock = document.getElementById('ww-modal-specs-block');
    if (p.specifications) {
      document.getElementById('ww-modal-specs').textContent = p.specifications;
      specsBlock.classList.remove('hidden');
    } else {
      specsBlock.classList.add('hidden');
    }

    const noteBlock = document.getElementById('ww-modal-admin-note-block');
    if (p.admin_note) {
      document.getElementById('ww-modal-admin-note').textContent = p.admin_note;
      noteBlock.classList.remove('hidden');
    } else {
      noteBlock.classList.add('hidden');
    }

    const footPend = document.getElementById('ww-modal-footer-pending');
    const footAppr = document.getElementById('ww-modal-footer-approved');
    const footRem = document.getElementById('ww-modal-footer-removed');
    footPend.classList.add('hidden');
    footAppr.classList.add('hidden');
    footRem.classList.add('hidden');

    const form = document.getElementById('ww-modal-moderate-form');
    form.action = 'store_product.php?id=' + encodeURIComponent(p.id);
    document.getElementById('ww-modal-admin-note-input').value = '';

    if (p.moderation_status === 'pending_approval' || p.moderation_status === 'rejected') {
      footPend.classList.remove('hidden');
    } else if (p.moderation_status === 'approved') {
      footAppr.classList.remove('hidden');
      document.getElementById('ww-modal-full-page').href = 'store_product.php?id=' + encodeURIComponent(p.id);
    } else {
      footRem.classList.remove('hidden');
      document.getElementById('ww-modal-full-page-removed').href = 'store_product.php?id=' + encodeURIComponent(p.id);
    }

    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
  }

  document.querySelectorAll('.ww-product-modal-open').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const id = parseInt(btn.getAttribute('data-product-id'), 10);
      if (id) openModal(id);
    });
  });

  modal.querySelectorAll('.ww-product-modal-close, .ww-product-modal-backdrop').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });
})();
</script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

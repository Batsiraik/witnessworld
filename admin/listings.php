<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Listings & gigs';
$activeNav = 'listings';

$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = ['all', 'pending_approval', 'approved', 'rejected', 'removed'];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$sql = 'SELECT l.id, l.title, l.listing_type, l.moderation_status, l.pricing_type, l.price_amount, l.currency,
        l.location_country_code, l.location_country_name, l.location_us_state,
        l.created_at, u.email AS user_email, u.first_name, u.last_name, u.username
        FROM listings l
        INNER JOIN users u ON u.id = l.user_id';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE l.moderation_status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY l.id DESC';

$rows = [];
$listingsDbError = null;
try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $listingsDbError = 'Listings tables are missing or out of date. See database/README.md.';
}

function ww_listing_status_badge(string $s): string
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
$self = ($base === '' || $base === '.') ? 'listings.php' : $base . '/listings.php';

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

<?php if ($listingsDbError !== null): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($listingsDbError, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Listings & gigs</h2>
      <p class="text-sm text-slate-500">New posts require approval before they are visible in the app. Reject with a note or remove inappropriate content.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $chip('all', 'All', $filter) ?>
      <?= $chip('pending_approval', 'Pending approval', $filter) ?>
      <?= $chip('approved', 'Approved', $filter) ?>
      <?= $chip('rejected', 'Rejected', $filter) ?>
      <?= $chip('removed', 'Removed', $filter) ?>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Listing</th>
          <th class="px-6 py-3">Seller</th>
          <th class="px-6 py-3">Type</th>
          <th class="px-6 py-3">Location</th>
          <th class="px-6 py-3">Price</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Created</th>
          <th class="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <tr class="bg-white hover:bg-brand-muted/20">
            <td class="px-6 py-4 font-medium text-slate-900">
              <?= htmlspecialchars((string) $r['title'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs font-normal text-slate-500">#<?= (int) $r['id'] ?></div>
            </td>
            <td class="px-6 py-4 text-slate-600">
              <?= htmlspecialchars(trim((string) $r['first_name'] . ' ' . (string) $r['last_name']), ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs text-slate-500">@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['listing_type'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-600">
              <?php
                $cn = trim((string) ($r['location_country_name'] ?? ''));
                $cc = trim((string) ($r['location_country_code'] ?? ''));
                $st = trim((string) ($r['location_us_state'] ?? ''));
                if ($cn === '' && $cc === '') {
                    echo '—';
                } else {
                    $line = $cn !== '' ? $cn : $cc;
                    if ($st !== '') {
                        $line .= ' · ' . $st;
                    }
                    echo htmlspecialchars($line, ENT_QUOTES, 'UTF-8');
                }
              ?>
            </td>
            <td class="px-6 py-4 text-slate-600">
              <?php
                $pt = (string) $r['pricing_type'];
                $pa = $r['price_amount'];
                if ($pt === 'none' || $pa === null) {
                    echo '—';
                } else {
                    echo htmlspecialchars((string) $r['currency'] . ' ' . number_format((float) $pa, 2), ENT_QUOTES, 'UTF-8');
                    echo $pt === 'hourly' ? ' <span class="text-xs text-slate-400">/hr</span>' : '';
                }
              ?>
            </td>
            <td class="px-6 py-4"><?= ww_listing_status_badge((string) $r['moderation_status']) ?></td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <button type="button" class="text-sm font-semibold text-brand hover:text-brand-dark" data-listing-review="<?= (int) $r['id'] ?>">Review</button>
                <a class="text-xs font-medium text-slate-500 hover:text-slate-700" href="listing.php?id=<?= (int) $r['id'] ?>" title="Full page">Page</a>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="8" class="px-6 py-8 text-center text-slate-500">No listings in this filter.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<div id="listing-review-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-slate-900/50 p-4" aria-hidden="true">
  <div class="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
    <div class="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
      <h3 class="text-base font-semibold text-slate-900" id="lr-modal-title">Review listing</h3>
      <button type="button" id="lr-modal-close" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">Close</button>
    </div>
    <div id="lr-modal-body" class="px-6 py-4 text-sm text-slate-700">
      <p class="text-slate-500">Loading…</p>
    </div>
  </div>
</div>

<script>
(function () {
  var modal = document.getElementById('listing-review-modal');
  var body = document.getElementById('lr-modal-body');
  var titleEl = document.getElementById('lr-modal-title');
  var closeBtn = document.getElementById('lr-modal-close');
  if (!modal || !body) return;

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function openModal() {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal() {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    modal.setAttribute('aria-hidden', 'true');
    body.innerHTML = '<p class="text-slate-500">Loading…</p>';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeModal();
  });

  document.querySelectorAll('[data-listing-review]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-listing-review');
      if (!id) return;
      openModal();
      titleEl.textContent = 'Listing #' + id;
      body.innerHTML = '<p class="text-slate-500">Loading…</p>';

      fetch('listing_review_api.php?id=' + encodeURIComponent(id), { credentials: 'same-origin' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!data.ok) {
            body.innerHTML = '<p class="text-red-600">' + esc(data.error || 'Failed to load') + '</p>';
            return;
          }
          var l = data.listing;
          var st = data.status || '';
          var html = '';

          html += '<div class="mb-4 flex flex-wrap items-start justify-between gap-2">';
          html += '<div><p class="font-semibold text-slate-900">' + esc(l.title) + '</p>';
          html += '<p class="text-xs text-slate-500">#' + esc(String(l.id)) + ' · ' + esc(l.listing_type) + '</p></div>';
          html += '<span class="text-xs font-semibold uppercase text-brand">' + esc(st.replace(/_/g, ' ')) + '</span></div>';

          var seller = data.seller || {};
          html += '<div class="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">';
          html += '<p class="text-xs font-semibold uppercase text-slate-500">Seller</p>';
          html += '<p class="mt-1">' + esc((seller.first_name || '') + ' ' + (seller.last_name || '')) + ' <span class="text-slate-500">(@' + esc(seller.username) + ')</span></p>';
          html += '<p class="text-slate-600">' + esc(seller.email) + '</p>';
          html += '<p class="mt-2 text-xs text-slate-500">Account: ' + esc(seller.user_status) + '</p>';
          html += '<p class="mt-2"><a class="font-semibold text-brand hover:underline" href="user.php?id=' + esc(String(seller.user_id)) + '">User profile</a></p></div>';

          html += '<dl class="grid gap-2 text-sm sm:grid-cols-2">';
          html += '<div><dt class="text-slate-500">Location</dt><dd class="font-medium">' + esc(data.loc_line || '—') + '</dd></div>';
          html += '<div><dt class="text-slate-500">Created</dt><dd class="font-medium">' + esc(l.created_at) + '</dd></div>';
          if (l.media_url) {
            html += '<div class="sm:col-span-2"><dt class="text-slate-500">Main image</dt><dd class="mt-1"><a class="break-all font-semibold text-brand hover:underline" href="' + esc(l.media_url) + '" target="_blank" rel="noopener">' + esc(l.media_url) + '</a></dd></div>';
          }
          if (l.video_url) {
            html += '<div class="sm:col-span-2"><dt class="text-slate-500">Video</dt><dd class="mt-1"><a class="break-all font-semibold text-brand hover:underline" href="' + esc(l.video_url) + '" target="_blank" rel="noopener">' + esc(l.video_url) + '</a></dd></div>';
          }
          html += '</dl>';

          if (data.soft_skills && data.soft_skills.length) {
            html += '<p class="mt-4 text-xs font-semibold uppercase text-slate-500">Soft skills</p><div class="mt-2 flex flex-wrap gap-2">';
            data.soft_skills.forEach(function (sk) {
              html += '<span class="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs">' + esc(sk) + '</span>';
            });
            html += '</div>';
          }

          if (data.portfolio_urls && data.portfolio_urls.length) {
            html += '<p class="mt-4 text-xs font-semibold uppercase text-slate-500">Portfolio</p><div class="mt-2 grid grid-cols-3 gap-2">';
            data.portfolio_urls.forEach(function (u) {
              html += '<a href="' + esc(u) + '" target="_blank" rel="noopener" class="block overflow-hidden rounded-lg border border-slate-100"><img src="' + esc(u) + '" alt="" class="h-24 w-full object-cover" loading="lazy" /></a>';
            });
            html += '</div>';
          }

          html += '<p class="mt-4 text-xs font-semibold uppercase text-slate-500">Description</p>';
          html += '<p class="mt-2 whitespace-pre-wrap text-slate-800">' + esc(l.description) + '</p>';

          if (l.admin_note) {
            html += '<div class="mt-4 rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-amber-950"><p class="text-xs font-semibold">Admin note</p><p class="mt-1 whitespace-pre-wrap">' + esc(l.admin_note) + '</p></div>';
          }

          html += '<div class="mt-6 border-t border-slate-100 pt-4"><p class="text-sm font-semibold text-slate-900">Moderation</p>';
          html += '<textarea id="lr-admin-note" rows="3" class="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Optional note (recommended when rejecting)"></textarea>';
          html += '<div id="lr-actions" class="mt-3 flex flex-wrap gap-2"></div></div>';

          html += '<p class="mt-4"><a class="text-sm font-semibold text-slate-500 hover:text-slate-800" href="listing.php?id=' + esc(String(l.id)) + '">Open full page →</a></p>';

          body.innerHTML = html;

          var actions = document.getElementById('lr-actions');
          var noteEl = document.getElementById('lr-admin-note');

          function postAction(action, confirmMsg) {
            if (confirmMsg && !window.confirm(confirmMsg)) return;
            var payload = { action: action, id: parseInt(id, 10), admin_note: (noteEl && noteEl.value) ? noteEl.value.trim() : '' };
            fetch('listing_review_api.php', {
              method: 'POST',
              credentials: 'same-origin',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            })
              .then(function (r) { return r.json(); })
              .then(function (res) {
                if (!res.ok) {
                  alert(res.error || 'Request failed');
                  return;
                }
                closeModal();
                window.location.reload();
              })
              .catch(function () { alert('Network error'); });
          }

          if (st === 'pending_approval' || st === 'rejected') {
            actions.innerHTML = '<button type="button" data-a="approve" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Approve</button> ' +
              '<button type="button" data-a="reject" class="rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Reject</button> ' +
              '<button type="button" data-a="remove" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button>';
          } else if (st === 'approved') {
            actions.innerHTML = '<button type="button" data-a="remove" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Remove</button> ' +
              '<button type="button" data-a="reject" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reject</button>';
          } else if (st === 'removed') {
            actions.innerHTML = '<button type="button" data-a="reopen" class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reopen as pending</button>';
          }

          actions.querySelectorAll('[data-a]').forEach(function (b) {
            b.addEventListener('click', function () {
              var a = b.getAttribute('data-a');
              if (a === 'remove') postAction('remove', 'Remove this listing?');
              else if (a === 'reject') postAction('reject', null);
              else if (a === 'approve') postAction('approve', null);
              else if (a === 'reopen') postAction('reopen', null);
            });
          });
        })
        .catch(function () {
          body.innerHTML = '<p class="text-red-600">Could not load listing.</p>';
        });
    });
  });
})();
</script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

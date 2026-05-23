<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Featured listings';
$activeNav = 'featured_listings';

$pdo = witnessworld_pdo();
$flash = '';
$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    if ($id > 0 && $action === 'remove') {
        $pdo->prepare('UPDATE listings SET is_featured = 0 WHERE id = ?')->execute([$id]);
        header('Location: featured_listings.php?removed=1');
        exit;
    }
}

$sql = 'SELECT l.id, l.title, l.listing_type, l.moderation_status, l.is_featured,
        l.pricing_type, l.price_amount, l.is_free, l.currency,
        l.location_country_name, l.location_us_state, l.created_at,
        COALESCE(mc.name, sc.name, cc.name) AS category_name,
        u.first_name, u.last_name, u.username
        FROM listings l
        INNER JOIN users u ON u.id = l.user_id
        LEFT JOIN marketplace_categories mc ON mc.id = l.category_id AND l.listing_type = \'classified\'
        LEFT JOIN service_categories sc ON sc.id = l.category_id AND l.listing_type = \'service\'
        LEFT JOIN community_categories cc ON cc.id = l.category_id AND l.listing_type = \'community\'
        WHERE l.is_featured = 1
        ORDER BY l.id DESC';

$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$apiUrl = ($base === '' || $base === '.') ? 'featured_listings_api.php' : $base . '/featured_listings_api.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if (isset($_GET['added']) && $_GET['added'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Listing added to featured.</div>
<?php endif; ?>
<?php if (isset($_GET['removed']) && $_GET['removed'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Listing removed from featured.</div>
<?php endif; ?>
<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>
<?php if ($error !== ''): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Featured listings</h2>
      <p class="text-sm text-slate-500 mt-1">These listings appear in the app’s Featured section and sort with priority. Only approved listings are visible to members.</p>
    </div>
    <button type="button" id="fl-open-add" class="admin-btn admin-btn--warning shrink-0">
      Add to featured
    </button>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Listing</th>
          <th class="px-6 py-3">Seller</th>
          <th class="px-6 py-3">Type</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Featured since</th>
          <th class="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100" id="fl-featured-tbody">
        <?php foreach ($rows as $r): ?>
          <tr class="bg-white hover:bg-brand-muted/20" data-featured-id="<?= (int) $r['id'] ?>">
            <td class="px-6 py-4 font-medium text-slate-900">
              <?= htmlspecialchars((string) $r['title'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs font-normal text-slate-500">#<?= (int) $r['id'] ?></div>
              <?= ww_admin_status_badge('featured', 'Featured') ?>
            </td>
            <td class="px-6 py-4 text-slate-600">
              <?= htmlspecialchars(trim((string) $r['first_name'] . ' ' . (string) $r['last_name']), ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs text-slate-500">@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['listing_type'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4"><?= ww_admin_status_badge((string) $r['moderation_status']) ?></td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <?= ww_admin_btn_link('listing.php?id=' . (int) $r['id'], 'Review', 'ghost', ['class' => 'admin-btn--sm']) ?>
                <form method="post" class="inline js-fl-remove-form" onsubmit="return confirm('Remove this listing from featured?');">
                  <input type="hidden" name="action" value="remove" />
                  <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
                  <button type="submit" class="admin-btn admin-btn--danger admin-btn--sm js-fl-remove" data-id="<?= (int) $r['id'] ?>" data-title="<?= htmlspecialchars((string) $r['title'], ENT_QUOTES, 'UTF-8') ?>">Remove from featured</button>
                </form>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr id="fl-empty-row"><td colspan="6" class="px-6 py-10 text-center text-slate-500">No featured listings yet. Click <strong>Add to featured</strong> to pick listings.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<div id="fl-add-modal" class="fixed inset-0 z-[60] hidden" role="dialog" aria-modal="true" aria-labelledby="fl-add-title">
  <div class="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] js-fl-modal-backdrop" aria-hidden="true"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
      <div class="flex shrink-0 items-center justify-between border-b border-slate-100 px-6 py-4">
        <div>
          <h2 id="fl-add-title" class="text-lg font-bold text-slate-900">Add to featured</h2>
          <p class="mt-0.5 text-xs text-slate-500">Search listings and select one to feature.</p>
        </div>
        <button type="button" class="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 js-fl-modal-close">Close</button>
      </div>
      <div class="border-b border-slate-100 px-6 py-3">
        <input
          type="search"
          id="fl-search"
          placeholder="Search by title, seller, username, or listing #…"
          class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          autocomplete="off"
        />
      </div>
      <div id="fl-search-results" class="flex-1 overflow-y-auto px-2 py-2 min-h-[200px]">
        <p class="px-4 py-8 text-center text-sm text-slate-500">Type to search listings…</p>
      </div>
    </div>
  </div>
</div>

<?php
$flJs = ($base === '' || $base === '.') ? 'assets/featured-listings.js' : $base . '/assets/featured-listings.js';
?>
<script>
  window.WW_FEATURED_LISTINGS = { apiUrl: <?= json_encode($apiUrl, JSON_THROW_ON_ERROR) ?> };
</script>
<script src="<?= htmlspecialchars($flJs, ENT_QUOTES, 'UTF-8') ?>"></script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

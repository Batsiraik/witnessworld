<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

$pageTitle = 'Add store products';
$activeNav = 'store_add_products';

$pdo = witnessworld_pdo();
$storeId = (int) ($_GET['store_id'] ?? 0);
$error = trim((string) ($_GET['error'] ?? ''));
$saved = isset($_GET['saved']) && $_GET['saved'] === '1';

$store = null;
if ($storeId > 0) {
    $st = $pdo->prepare(
        'SELECT s.id, s.name, s.moderation_status, s.user_id, u.first_name, u.last_name, u.username
         FROM stores s INNER JOIN users u ON u.id = s.user_id WHERE s.id = ? LIMIT 1'
    );
    $st->execute([$storeId]);
    $store = $st->fetch(PDO::FETCH_ASSOC) ?: null;
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$lookupApi = ($base === '' || $base === '.') ? 'admin_lookup_api.php' : $base . '/admin_lookup_api.php';
$uploadApi = ($base === '' || $base === '.') ? 'admin_media_upload.php' : $base . '/admin_media_upload.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($saved): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Product saved. Add another below or open the store in admin.</div>
<?php endif; ?>
<?php if ($error !== ''): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="mb-6">
  <h1 class="text-xl font-bold text-slate-900">Add store products</h1>
  <p class="mt-1 text-sm text-slate-500">Add products on behalf of a seller. Products are saved as <strong>approved</strong> immediately.</p>
</div>

<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel mb-6">
  <h2 class="text-base font-semibold text-slate-900">1. Select store</h2>
  <div id="sp-store-selected" class="mt-3 <?= $store ? '' : 'hidden' ?> rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
    <?php if ($store): ?>
      <strong><?= htmlspecialchars((string) $store['name'], ENT_QUOTES, 'UTF-8') ?></strong>
      <span class="text-slate-500">(#<?= (int) $store['id'] ?> · <?= htmlspecialchars(ww_admin_user_label($store), ENT_QUOTES, 'UTF-8') ?>)</span>
    <?php endif; ?>
    <button type="button" id="sp-store-change" class="ml-2 text-brand font-semibold hover:underline">Change</button>
  </div>
  <button type="button" id="sp-open-store" class="mt-3 admin-btn admin-btn--primary <?= $store ? 'hidden' : '' ?>">Choose store</button>
</div>

<div id="sp-product-panel" class="<?= $store ? '' : 'hidden' ?> rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900">2. Product details</h2>
  <form method="post" action="store_product_save.php" class="mt-4 space-y-4" id="sp-product-form">
    <input type="hidden" name="store_id" id="sp-store-id" value="<?= (int) $storeId ?>" />
    <div>
      <label class="text-xs font-semibold text-slate-600">Product name *</label>
      <input name="name" required class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">Description</label>
      <textarea name="description" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">Specifications</label>
      <textarea name="specifications" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
    </div>
    <div class="grid gap-3 sm:grid-cols-2">
      <div>
        <label class="text-xs font-semibold text-slate-600">Price *</label>
        <input name="price_amount" type="number" step="0.01" min="0" required class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Currency</label>
        <input name="currency" value="USD" maxlength="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">Product photo *</label>
      <input type="file" accept="image/*" id="sp-photo-file" class="mt-1 text-sm" />
      <input type="hidden" name="image_url" id="sp-image-url" required />
      <p class="mt-1 text-xs text-slate-500" id="sp-image-label"></p>
    </div>
    <div class="flex flex-wrap gap-2 pt-2">
      <button type="submit" name="add_another" value="1" class="admin-btn admin-btn--warning">Save &amp; add another</button>
      <button type="submit" class="admin-btn admin-btn--success">Save product</button>
    </div>
  </form>
</div>

<div id="sp-store-modal" class="fixed inset-0 z-[60] hidden" role="dialog" aria-modal="true">
  <div class="absolute inset-0 bg-slate-900/65 js-sp-store-close"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">
      <div class="border-b px-5 py-4 flex justify-between">
        <h3 class="font-bold">Choose store</h3>
        <button type="button" class="text-sm js-sp-store-close">Close</button>
      </div>
      <div class="px-5 py-3 border-b">
        <input type="search" id="sp-store-search" placeholder="Search stores…" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div id="sp-store-results" class="overflow-y-auto flex-1 p-2"></div>
    </div>
  </div>
</div>

<?php
$spJs = ($base === '' || $base === '.') ? 'assets/store-add-products.js' : $base . '/assets/store-add-products.js';
?>
<script>
  window.WW_STORE_PRODUCTS = {
    lookupApi: <?= json_encode($lookupApi, JSON_THROW_ON_ERROR) ?>,
    uploadApi: <?= json_encode($uploadApi, JSON_THROW_ON_ERROR) ?>,
    storeId: <?= (int) $storeId ?>,
    storeUserId: <?= $store ? (int) $store['user_id'] : 0 ?>
  };
</script>
<script src="<?= htmlspecialchars($spJs, ENT_QUOTES, 'UTF-8') ?>"></script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

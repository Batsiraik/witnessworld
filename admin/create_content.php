<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

$pageTitle = 'Add listing for user';
$activeNav = 'create_content';

$pdo = witnessworld_pdo();
$prefillUserId = (int) ($_GET['user_id'] ?? 0);
$prefillType = trim((string) ($_GET['type'] ?? ''));
$error = trim((string) ($_GET['error'] ?? ''));

$prefillUser = $prefillUserId > 0 ? ww_admin_load_user($pdo, $prefillUserId) : null;

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$lookupApi = ($base === '' || $base === '.') ? 'admin_lookup_api.php' : $base . '/admin_lookup_api.php';
$uploadApi = ($base === '' || $base === '.') ? 'admin_media_upload.php' : $base . '/admin_media_upload.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($error !== ''): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 class="text-xl font-bold text-slate-900">Add listing for user</h1>
    <p class="mt-1 text-sm text-slate-500">Create content on behalf of a member. It is saved as <strong>approved</strong> immediately.</p>
  </div>
  <a href="store_add_products.php" class="admin-btn admin-btn--soft">Add store products →</a>
</div>

<div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel mb-6">
  <ol class="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-slate-500" id="ac-steps">
    <li class="ac-step-pill rounded-full bg-brand/15 px-3 py-1 text-brand" data-step="1">1. Member</li>
    <li class="ac-step-pill rounded-full bg-slate-100 px-3 py-1" data-step="2">2. Type</li>
    <li class="ac-step-pill rounded-full bg-slate-100 px-3 py-1" data-step="3">3. Details</li>
    <li class="ac-step-pill rounded-full bg-slate-100 px-3 py-1" data-step="4">4. Review</li>
  </ol>
</div>

<!-- Step 1: User -->
<section id="ac-panel-1" class="ac-panel rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900">Select member</h2>
  <p class="mt-1 text-sm text-slate-500">Search by name, email, username, or user ID.</p>
  <div id="ac-user-selected" class="mt-4 hidden rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm">
    <span class="font-semibold text-slate-900" id="ac-user-label"></span>
    <button type="button" class="ml-3 text-brand font-semibold hover:underline" id="ac-user-change">Change</button>
  </div>
  <button type="button" id="ac-open-user" class="mt-4 admin-btn admin-btn--primary">Choose member</button>
</section>

<!-- Step 2: Type -->
<section id="ac-panel-2" class="ac-panel hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900">Content type</h2>
  <p class="mt-1 text-sm text-slate-500">What are you creating for this member?</p>
  <div class="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
    <?php
    $types = [
        'classified' => ['Marketplace listing', 'Buy/sell classified ad'],
        'service' => ['Service listing', 'Professional services gig'],
        'community' => ['Community classified', 'Community board post'],
        'store' => ['Online store', 'Storefront for products'],
        'directory' => ['Business directory', 'Business directory profile'],
    ];
    foreach ($types as $key => $meta): ?>
      <button type="button" class="ac-type-card rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-left hover:border-brand hover:bg-brand/5 transition" data-type="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>">
        <span class="block font-semibold text-slate-900"><?= htmlspecialchars($meta[0], ENT_QUOTES, 'UTF-8') ?></span>
        <span class="mt-1 block text-xs text-slate-500"><?= htmlspecialchars($meta[1], ENT_QUOTES, 'UTF-8') ?></span>
      </button>
    <?php endforeach; ?>
  </div>
  <div class="mt-4 flex gap-2">
    <button type="button" class="admin-btn admin-btn--ghost ac-back" data-to="1">← Back</button>
  </div>
</section>

<!-- Step 3: Form -->
<section id="ac-panel-3" class="ac-panel hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900" id="ac-form-title">Details</h2>
  <form id="ac-form" class="mt-4 space-y-4" enctype="multipart/form-data" onsubmit="return false;">
    <input type="hidden" name="user_id" id="ac-field-user-id" value="" />
    <input type="hidden" name="content_type" id="ac-field-content-type" value="" />

    <!-- Listing fields -->
    <div class="ac-fields ac-fields-listing hidden space-y-4">
      <div>
        <label class="text-xs font-semibold text-slate-600">Title *</label>
        <input name="title" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Description *</label>
        <textarea name="description" rows="5" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Category</label>
        <select name="category_id" id="ac-listing-category" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">— Optional —</option></select>
      </div>
      <div class="ac-classified-only hidden grid gap-3 sm:grid-cols-3">
        <label class="flex items-center gap-2 text-sm"><input type="checkbox" name="is_free" value="1" class="rounded" /> Free listing</label>
        <div>
          <label class="text-xs font-semibold text-slate-600">Price</label>
          <input name="price_amount" type="number" step="0.01" min="0" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600">Currency</label>
          <input name="currency" value="USD" maxlength="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Main image *</label>
        <input type="file" accept="image/*" class="ac-upload mt-1 text-sm" data-kind="listing" data-target="media_url" />
        <input type="hidden" name="media_url" id="ac-media-url" />
        <p class="mt-1 text-xs text-slate-500" id="ac-media-url-label"></p>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Video (optional)</label>
        <input type="file" accept="video/mp4,video/quicktime" class="ac-upload mt-1 text-sm" data-kind="listing" data-target="video_url" data-video="1" />
        <input type="hidden" name="video_url" id="ac-video-url" />
      </div>
      <div class="ac-service-only hidden">
        <label class="text-xs font-semibold text-slate-600">Soft skills (comma-separated)</label>
        <input name="soft_skills" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Design, Writing, …" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Portfolio image URLs (one per line, after upload)</label>
        <textarea name="portfolio_urls" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono text-xs"></textarea>
      </div>
    </div>

    <!-- Store fields -->
    <div class="ac-fields ac-fields-store hidden space-y-4">
      <div>
        <label class="text-xs font-semibold text-slate-600">Store name *</label>
        <input name="name" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Description *</label>
        <textarea name="description" rows="4" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">What you sell (short) *</label>
        <input name="sells_summary" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Store category</label>
        <select name="category_id" id="ac-store-category" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">— Optional —</option></select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Logo *</label>
        <input type="file" accept="image/*" class="ac-upload mt-1 text-sm" data-kind="store" data-target="logo_url" />
        <input type="hidden" name="logo_url" id="ac-logo-url" />
        <p class="mt-1 text-xs text-slate-500" id="ac-logo-url-label"></p>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Banner (optional)</label>
        <input type="file" accept="image/*" class="ac-upload mt-1 text-sm" data-kind="store" data-target="banner_url" />
        <input type="hidden" name="banner_url" id="ac-banner-url" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Delivery</label>
        <select name="delivery_type" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="worldwide">Worldwide</option>
          <option value="usa_only">USA only</option>
          <option value="digital_only">Digital only</option>
          <option value="local_pickup">Local pickup</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Delivery notes</label>
        <textarea name="delivery_notes" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
    </div>

    <!-- Directory fields -->
    <div class="ac-fields ac-fields-directory hidden space-y-4">
      <div>
        <label class="text-xs font-semibold text-slate-600">Business name *</label>
        <input name="business_name" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Category *</label>
        <select name="category_id" id="ac-directory-category" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required><option value="">Select…</option></select>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Tagline</label>
        <input name="tagline" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Description</label>
        <textarea name="description" rows="4" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-slate-600">City *</label>
          <input name="city" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600">Phone *</label>
          <input name="phone" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Public email *</label>
        <input type="email" name="email" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Address</label>
        <input name="address_line" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Logo (optional)</label>
        <input type="file" accept="image/*" class="ac-upload mt-1 text-sm" data-kind="directory" data-target="logo_url" />
        <input type="hidden" name="logo_url" id="ac-dir-logo-url" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Website</label>
        <input name="website" type="url" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Hours</label>
        <textarea name="hours_text" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
    </div>

    <!-- Location (listing + store + directory) -->
    <div class="ac-fields-location hidden grid gap-3 sm:grid-cols-2 border-t border-slate-100 pt-4">
      <div>
        <label class="text-xs font-semibold text-slate-600">Country *</label>
        <select name="location_country_code" id="ac-country" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select…</option></select>
      </div>
      <div id="ac-state-wrap" class="hidden">
        <label class="text-xs font-semibold text-slate-600">U.S. state *</label>
        <select name="location_us_state_code" id="ac-state" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Select…</option></select>
      </div>
    </div>

    <div>
      <label class="text-xs font-semibold text-slate-600">Admin note (optional)</label>
      <textarea name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Created on behalf of member…"></textarea>
    </div>

    <div class="flex flex-wrap gap-2 pt-2">
      <button type="button" class="admin-btn admin-btn--ghost ac-back" data-to="2">← Back</button>
      <button type="button" id="ac-to-review" class="admin-btn admin-btn--primary">Review →</button>
    </div>
  </form>
</section>

<!-- Step 4: Review -->
<section id="ac-panel-4" class="ac-panel hidden rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900">Review &amp; publish</h2>
  <p class="mt-1 text-sm text-slate-500">This will be live immediately as <strong>approved</strong>.</p>
  <div id="ac-review-body" class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm space-y-2"></div>
  <form method="post" action="create_content_save.php" id="ac-save-form" class="mt-6 flex flex-wrap gap-2">
    <div id="ac-save-hidden"></div>
    <button type="button" class="admin-btn admin-btn--ghost ac-back" data-to="3">← Edit</button>
    <button type="submit" class="admin-btn admin-btn--success">Save &amp; publish</button>
  </form>
</section>

<!-- User picker modal -->
<div id="ac-user-modal" class="fixed inset-0 z-[60] hidden" role="dialog" aria-modal="true">
  <div class="absolute inset-0 bg-slate-900/65 js-ac-user-close"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">
      <div class="border-b px-5 py-4 flex justify-between items-center">
        <h3 class="font-bold text-slate-900">Choose member</h3>
        <button type="button" class="text-sm font-semibold text-slate-500 js-ac-user-close">Close</button>
      </div>
      <div class="px-5 py-3 border-b">
        <input type="search" id="ac-user-search" placeholder="Search members…" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div id="ac-user-results" class="overflow-y-auto flex-1 p-2 min-h-[200px]"></div>
    </div>
  </div>
</div>

<?php
$acJs = ($base === '' || $base === '.') ? 'assets/admin-create-content.js' : $base . '/assets/admin-create-content.js';
?>
<script>
  window.WW_ADMIN_CREATE = {
    lookupApi: <?= json_encode($lookupApi, JSON_THROW_ON_ERROR) ?>,
    uploadApi: <?= json_encode($uploadApi, JSON_THROW_ON_ERROR) ?>,
    prefillUserId: <?= (int) $prefillUserId ?>,
    prefillType: <?= json_encode($prefillType, JSON_THROW_ON_ERROR) ?>,
    prefillUserLabel: <?= json_encode($prefillUser ? ww_admin_user_label($prefillUser) . ' (@' . $prefillUser['username'] . ')' : '', JSON_THROW_ON_ERROR) ?>
  };
</script>
<script src="<?= htmlspecialchars($acJs, ENT_QUOTES, 'UTF-8') ?>"></script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

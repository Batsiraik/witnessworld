<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$tab = ww_admin_content_tab_resolve((string) ($_GET['tab'] ?? 'classified'));
$contentTabs = ww_admin_content_tabs();
$tabMeta = $contentTabs[$tab];

$pageTitle = 'Listings';
$activeNav = 'content';

$pdo = witnessworld_pdo();
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$contentPage = ($base === '' || $base === '.') ? 'content.php' : $base . '/content.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="mb-6 space-y-4">
  <div>
    <h1 class="text-xl font-bold text-slate-900">Listings &amp; content</h1>
    <p class="mt-1 text-sm text-slate-500">Approve, suspend, or delete user-submitted listings across all modules.</p>
  </div>
  <?= ww_admin_module_tabs($contentPage, $contentTabs, $tab) ?>
</div>

<?php
$hubReturn = ww_admin_content_return_token($tab);
if (in_array($tab, ['classified', 'service', 'community'], true)) {
    $listingType = (string) ($tabMeta['listing_type'] ?? $tab);
    require __DIR__ . '/partials/content_hub/listings_tab.php';
} elseif ($tab === 'stores') {
    require __DIR__ . '/partials/content_hub/stores_tab.php';
} elseif ($tab === 'products') {
    require __DIR__ . '/partials/content_hub/products_tab.php';
} elseif ($tab === 'directory') {
    require __DIR__ . '/partials/content_hub/directory_tab.php';
}
?>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$tab = ww_admin_category_tab_resolve((string) ($_GET['tab'] ?? 'classified'));
$categoryTabs = ww_admin_category_tabs();
$tabMeta = $categoryTabs[$tab];

$pdo = witnessworld_pdo();
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$categoriesPage = ($base === '' || $base === '.') ? 'categories.php' : $base . '/categories.php';
$table = (string) $tabMeta['table'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $postTab = ww_admin_category_tab_resolve((string) ($_POST['hub_tab'] ?? $tab));
    $postMeta = $categoryTabs[$postTab];
    $postTable = (string) $postMeta['table'];
    $action = (string) ($_POST['action'] ?? '');
    $flash = '';

    if ($action === 'add') {
        $name = trim((string) ($_POST['name'] ?? ''));
        if ($name !== '' && mb_strlen($name) <= 120) {
            $slug = preg_replace('/[^a-z0-9]+/', '_', strtolower($name));
            $slug = trim($slug, '_');
            $maxSt = $pdo->query('SELECT COALESCE(MAX(sort_order),0) FROM ' . $postTable);
            $nextSort = (int) $maxSt->fetchColumn() + 1;
            try {
                $pdo->prepare('INSERT INTO ' . $postTable . ' (name, slug, sort_order) VALUES (?, ?, ?)')
                    ->execute([$name, $slug, $nextSort]);
                $flash = 'added';
            } catch (Throwable) {
                $flash = 'dup';
            }
        }
    } elseif ($action === 'delete') {
        $catId = (int) ($_POST['cat_id'] ?? 0);
        if ($catId > 0) {
            $fkTable = (string) $postMeta['fk_table'];
            $fkColumn = (string) $postMeta['fk_column'];
            if ($fkTable === 'listings' && isset($postMeta['listing_type'])) {
                $pdo->prepare(
                    'UPDATE listings SET category_id = NULL WHERE category_id = ? AND listing_type = ?'
                )->execute([$catId, (string) $postMeta['listing_type']]);
            } else {
                $pdo->prepare(
                    'UPDATE ' . $fkTable . ' SET ' . $fkColumn . ' = NULL WHERE ' . $fkColumn . ' = ?'
                )->execute([$catId]);
            }
            $pdo->prepare('DELETE FROM ' . $postTable . ' WHERE id = ?')->execute([$catId]);
            $flash = 'deleted';
        }
    } elseif ($action === 'toggle') {
        $catId = (int) ($_POST['cat_id'] ?? 0);
        if ($catId > 0) {
            $pdo->prepare('UPDATE ' . $postTable . ' SET is_active = NOT is_active WHERE id = ?')->execute([$catId]);
            $flash = 'toggled';
        }
    } elseif ($action === 'rename') {
        $catId = (int) ($_POST['cat_id'] ?? 0);
        $newName = trim((string) ($_POST['name'] ?? ''));
        if ($catId > 0 && $newName !== '' && mb_strlen($newName) <= 120) {
            $slug = preg_replace('/[^a-z0-9]+/', '_', strtolower($newName));
            $slug = trim($slug, '_');
            try {
                $pdo->prepare('UPDATE ' . $postTable . ' SET name = ?, slug = ? WHERE id = ?')
                    ->execute([$newName, $slug, $catId]);
                $flash = 'renamed';
            } catch (Throwable) {
                $flash = 'dup';
            }
        }
    }

    $redirect = ww_admin_categories_url($postTab, $base === '.' ? '' : $base);
    if ($flash !== '') {
        $redirect .= (str_contains($redirect, '?') ? '&' : '?') . 'flash=' . urlencode($flash);
    }
    header('Location: ' . $redirect);
    exit;
}

$pageTitle = 'Categories';
$activeNav = 'categories';
$flash = (string) ($_GET['flash'] ?? '');

$rows = [];
$dbErr = null;
try {
    $rows = $pdo->query('SELECT * FROM ' . $table . ' ORDER BY sort_order ASC, id ASC')
        ->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $dbErr = 'Table ' . $table . ' does not exist yet. Run the SQL from database/revisions.sql.';
}

$deleteWarning = 'Delete this category? Items using it will become uncategorised.';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="mb-6 space-y-4">
  <div>
    <h1 class="text-xl font-bold text-slate-900">Manage categories</h1>
    <p class="mt-1 text-sm text-slate-500">Add, rename, hide, or delete categories shown to users in each module.</p>
  </div>
  <?= ww_admin_module_tabs($categoriesPage, $categoryTabs, $tab) ?>
</div>

<?php if ($dbErr): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($dbErr, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<?php if ($flash === 'added'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">Category added.</div>
<?php elseif ($flash === 'deleted'): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">Category deleted. Linked items were uncategorised.</div>
<?php elseif ($flash === 'toggled'): ?>
  <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Category visibility toggled.</div>
<?php elseif ($flash === 'renamed'): ?>
  <div class="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">Category renamed.</div>
<?php elseif ($flash === 'dup'): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">A category with that name or slug already exists.</div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-3">
    <div>
      <h2 class="text-base font-semibold text-slate-900"><?= htmlspecialchars($tabMeta['label'], ENT_QUOTES, 'UTF-8') ?> categories</h2>
      <p class="text-sm text-slate-500"><?= htmlspecialchars($tabMeta['desc'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <form method="post" class="flex flex-wrap items-end gap-3">
      <input type="hidden" name="hub_tab" value="<?= htmlspecialchars($tab, ENT_QUOTES, 'UTF-8') ?>" />
      <input type="hidden" name="action" value="add" />
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="cat_name">New category</label>
        <input type="text" id="cat_name" name="name" maxlength="120" required class="mt-1 w-60 rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Category name" />
      </div>
      <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Add category</button>
    </form>
  </div>

  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">#</th>
          <th class="px-6 py-3">Name</th>
          <th class="px-6 py-3">Slug</th>
          <th class="px-6 py-3">Sort</th>
          <th class="px-6 py-3">Active</th>
          <th class="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <tr class="bg-white hover:bg-brand-muted/20">
            <td class="px-6 py-3 text-slate-500"><?= (int) $r['id'] ?></td>
            <td class="px-6 py-3 font-medium text-slate-900"><?= htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-3 text-slate-500"><?= htmlspecialchars((string) $r['slug'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-3 text-slate-500"><?= (int) $r['sort_order'] ?></td>
            <td class="px-6 py-3">
              <?php if ((int) $r['is_active']): ?>
                <span class="inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-600/20">Active</span>
              <?php else: ?>
                <span class="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-600/10">Hidden</span>
              <?php endif; ?>
            </td>
            <td class="px-6 py-3 text-right">
              <div class="flex flex-wrap items-center justify-end gap-2">
                <form method="post" class="inline">
                  <input type="hidden" name="hub_tab" value="<?= htmlspecialchars($tab, ENT_QUOTES, 'UTF-8') ?>" />
                  <input type="hidden" name="action" value="toggle" />
                  <input type="hidden" name="cat_id" value="<?= (int) $r['id'] ?>" />
                  <button type="submit" class="text-sm font-semibold text-brand hover:text-brand-dark"><?= (int) $r['is_active'] ? 'Hide' : 'Show' ?></button>
                </form>
                <button type="button" class="text-sm font-semibold text-slate-600 hover:text-slate-900" onclick="renameCategory(<?= (int) $r['id'] ?>, <?= htmlspecialchars(json_encode((string) $r['name'], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8') ?>)">Rename</button>
                <button type="button" class="text-sm font-semibold text-red-600 hover:text-red-800" onclick="confirmDeleteCategory(<?= (int) $r['id'] ?>, <?= htmlspecialchars(json_encode((string) $r['name'], JSON_THROW_ON_ERROR), ENT_QUOTES, 'UTF-8') ?>)">Delete</button>
              </div>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No categories yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<form id="rename-form" method="post" class="hidden">
  <input type="hidden" name="hub_tab" value="<?= htmlspecialchars($tab, ENT_QUOTES, 'UTF-8') ?>" />
  <input type="hidden" name="action" value="rename" />
  <input type="hidden" name="cat_id" id="rename-cat-id" />
  <input type="hidden" name="name" id="rename-name" />
</form>

<?php require __DIR__ . '/partials/category_rename_modal.php'; ?>

<?php
$ww_category_delete_modal_warning = $deleteWarning;
$categoryHubTab = $tab;
require __DIR__ . '/partials/category_delete_modal.php';
?>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

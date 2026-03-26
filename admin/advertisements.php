<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Advertisements';
$activeNav = 'advertisements';

$pdo = witnessworld_pdo();
$flash = '';
$adsDbError = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    try {
        if ($action === 'add') {
            $title = trim((string) ($_POST['title'] ?? ''));
            if ($title !== '') {
                $body = trim((string) ($_POST['body'] ?? ''));
                $target = trim((string) ($_POST['target_url'] ?? ''));
                $image = trim((string) ($_POST['image_url'] ?? ''));
                $slot = trim((string) ($_POST['slot'] ?? 'banner')) ?: 'banner';
                $sort = (int) ($_POST['sort_order'] ?? 0);
                $active = isset($_POST['is_active']) ? 1 : 0;
                $st = $pdo->prepare(
                    'INSERT INTO advertisements (title, body, target_url, image_url, slot, is_active, sort_order) VALUES (?,?,?,?,?,?,?)'
                );
                $st->execute([
                    $title,
                    $body !== '' ? $body : null,
                    $target !== '' ? $target : null,
                    $image !== '' ? $image : null,
                    $slot,
                    $active,
                    $sort,
                ]);
                $flash = 'Advertisement created.';
            }
        } elseif ($action === 'save' && isset($_POST['id'])) {
            $id = (int) $_POST['id'];
            $title = trim((string) ($_POST['title'] ?? ''));
            if ($id > 0 && $title !== '') {
                $body = trim((string) ($_POST['body'] ?? ''));
                $target = trim((string) ($_POST['target_url'] ?? ''));
                $image = trim((string) ($_POST['image_url'] ?? ''));
                $slot = trim((string) ($_POST['slot'] ?? 'banner')) ?: 'banner';
                $sort = (int) ($_POST['sort_order'] ?? 0);
                $active = isset($_POST['is_active']) ? 1 : 0;
                $pdo->prepare(
                    'UPDATE advertisements SET title=?, body=?, target_url=?, image_url=?, slot=?, is_active=?, sort_order=? WHERE id=?'
                )->execute([
                    $title,
                    $body !== '' ? $body : null,
                    $target !== '' ? $target : null,
                    $image !== '' ? $image : null,
                    $slot,
                    $active,
                    $sort,
                    $id,
                ]);
                $flash = 'Saved.';
            }
        } elseif ($action === 'delete' && isset($_POST['id'])) {
            $id = (int) $_POST['id'];
            if ($id > 0) {
                $pdo->prepare('DELETE FROM advertisements WHERE id = ?')->execute([$id]);
                $flash = 'Deleted.';
            }
        }
    } catch (Throwable) {
        $flash = 'Advertisements table missing or error. See database/README.md.';
    }
}

$rows = [];
try {
    $rows = $pdo->query('SELECT * FROM advertisements ORDER BY sort_order ASC, id DESC')->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $adsDbError = 'Advertisements table is missing. See database/README.md.';
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>
<?php if ($adsDbError !== null): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($adsDbError, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="grid gap-6 lg:grid-cols-2">
  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h2 class="text-base font-semibold text-slate-900">New advertisement</h2>
    <p class="mt-1 text-sm text-slate-500">Placeholder slots for future in-app placements (e.g. home banner).</p>
    <form method="post" class="mt-4 space-y-3">
      <input type="hidden" name="action" value="add" />
      <div>
        <label class="text-xs font-semibold text-slate-600">Title</label>
        <input name="title" required class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Body (optional)</label>
        <textarea name="body" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Target URL</label>
        <input name="target_url" type="url" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Image URL</label>
        <input name="image_url" type="url" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="https://..." />
      </div>
      <div class="grid gap-3 sm:grid-cols-2">
        <div>
          <label class="text-xs font-semibold text-slate-600">Slot</label>
          <input name="slot" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value="banner" />
        </div>
        <div>
          <label class="text-xs font-semibold text-slate-600">Sort order</label>
          <input name="sort_order" type="number" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" value="0" />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="is_active" value="1" checked class="rounded border-slate-300" />
        Active
      </label>
      <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Create</button>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel lg:col-span-2">
    <h2 class="text-base font-semibold text-slate-900">All advertisements</h2>
    <div class="mt-4 space-y-6">
      <?php foreach ($rows as $r): ?>
        <div class="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
          <form method="post" class="space-y-3">
            <input type="hidden" name="action" value="save" />
            <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="text-xs font-semibold text-slate-600">Title</label>
                <input name="title" required class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value="<?= htmlspecialchars((string) $r['title'], ENT_QUOTES, 'UTF-8') ?>" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600">Slot</label>
                <input name="slot" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value="<?= htmlspecialchars((string) $r['slot'], ENT_QUOTES, 'UTF-8') ?>" />
              </div>
            </div>
            <div>
              <label class="text-xs font-semibold text-slate-600">Body</label>
              <textarea name="body" rows="2" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><?= htmlspecialchars((string) ($r['body'] ?? ''), ENT_QUOTES, 'UTF-8') ?></textarea>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <div>
                <label class="text-xs font-semibold text-slate-600">Target URL</label>
                <input name="target_url" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value="<?= htmlspecialchars((string) ($r['target_url'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" />
              </div>
              <div>
                <label class="text-xs font-semibold text-slate-600">Image URL</label>
                <input name="image_url" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value="<?= htmlspecialchars((string) ($r['image_url'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" />
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-4">
              <div>
                <label class="text-xs font-semibold text-slate-600">Sort</label>
                <input name="sort_order" type="number" class="mt-1 w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm" value="<?= (int) $r['sort_order'] ?>" />
              </div>
              <label class="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" name="is_active" value="1" <?= ((int) $r['is_active']) ? 'checked' : '' ?> class="rounded border-slate-300" />
                Active
              </label>
            </div>
            <div class="flex flex-wrap gap-2">
              <button type="submit" class="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">Save</button>
            </div>
          </form>
          <form method="post" class="mt-2" onsubmit="return confirm('Delete this advertisement?');">
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="id" value="<?= (int) $r['id'] ?>" />
            <button type="submit" class="text-xs font-semibold text-red-600 hover:underline">Delete</button>
          </form>
        </div>
      <?php endforeach; ?>
      <?php if ($rows === []): ?>
        <p class="text-sm text-slate-500">No advertisements yet.</p>
      <?php endif; ?>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

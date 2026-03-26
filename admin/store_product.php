<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/push_triggers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: store_products.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $note = trim((string) ($_POST['admin_note'] ?? ''));
    try {
        $st = $pdo->prepare(
            'SELECT p.id, p.moderation_status, p.name, s.user_id AS owner_user_id
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $now = date('Y-m-d H:i:s');
            if ($action === 'approve') {
                $pdo->prepare(
                    'UPDATE store_products SET moderation_status = ?, admin_note = NULL, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['approved', $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_product_review(
                    $pdo,
                    (int) $row['owner_user_id'],
                    'approve',
                    (string) $row['name']
                );
            } elseif ($action === 'reject') {
                $pdo->prepare(
                    'UPDATE store_products SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['rejected', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_product_review(
                    $pdo,
                    (int) $row['owner_user_id'],
                    'reject',
                    (string) $row['name']
                );
            } elseif ($action === 'remove') {
                $pdo->prepare(
                    'UPDATE store_products SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['removed', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
            } elseif ($action === 'reopen') {
                $pdo->prepare(
                    'UPDATE store_products SET moderation_status = ?, admin_note = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL WHERE id = ?'
                )->execute(['pending_approval', $id]);
            }
        }
    } catch (Throwable) {
        header('Location: store_products.php');
        exit;
    }
    $returnTo = trim((string) ($_POST['return_to'] ?? ''));
    if ($returnTo === 'list') {
        header('Location: store_products.php?moderated=1');
        exit;
    }
    header('Location: store_product.php?id=' . $id);
    exit;
}

$product = null;
try {
    $st = $pdo->prepare(
        'SELECT p.*, s.name AS store_name, s.id AS store_id, s.moderation_status AS store_status,
                u.email, u.first_name, u.last_name, u.username,
                a.name AS reviewer_name
         FROM store_products p
         INNER JOIN stores s ON s.id = p.store_id
         INNER JOIN users u ON u.id = s.user_id
         LEFT JOIN admins a ON a.id = p.reviewed_by_admin_id
         WHERE p.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $product = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    header('Location: store_products.php');
    exit;
}
if (!$product) {
    header('Location: store_products.php');
    exit;
}

$pageTitle = 'Product #' . $id;
$activeNav = 'store_products';

$status = (string) ($product['moderation_status'] ?? '');
$priceLine = htmlspecialchars((string) $product['currency'] . ' ' . number_format((float) $product['price_amount'], 2), ENT_QUOTES, 'UTF-8');

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="store_products.php" class="font-semibold text-brand hover:underline">← Store products</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $product['name'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">#<?= (int) $product['id'] ?> · <?= $priceLine ?></p>
    </div>
    <div class="text-sm font-semibold text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars(str_replace('_', ' ', $status), ENT_QUOTES, 'UTF-8') ?></span></div>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Store</h3>
    <p class="mt-2 text-sm text-slate-800"><?= htmlspecialchars((string) $product['store_name'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-2">
      <a class="text-sm font-semibold text-brand hover:underline" href="store.php?id=<?= (int) $product['store_id'] ?>">Open store moderation</a>
    </p>
    <p class="mt-2 text-xs text-slate-500">Store status: <?= htmlspecialchars(str_replace('_', ' ', (string) $product['store_status']), ENT_QUOTES, 'UTF-8') ?></p>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Seller</h3>
    <p class="mt-2 text-sm text-slate-700">
      <?= htmlspecialchars(trim((string) $product['first_name'] . ' ' . (string) $product['last_name']), ENT_QUOTES, 'UTF-8') ?>
      <span class="text-slate-500">(@<?= htmlspecialchars((string) $product['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
    </p>
    <p class="text-sm text-slate-600"><?= htmlspecialchars((string) $product['email'], ENT_QUOTES, 'UTF-8') ?></p>
  </div>

  <?php if (!empty($product['image_url'])): ?>
    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <h3 class="text-sm font-semibold text-slate-900">Image</h3>
      <a href="<?= htmlspecialchars((string) $product['image_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="mt-3 inline-block">
        <img src="<?= htmlspecialchars((string) $product['image_url'], ENT_QUOTES, 'UTF-8') ?>" alt="" class="max-h-64 rounded-xl object-contain ring-1 ring-slate-100" loading="lazy" />
      </a>
    </div>
  <?php endif; ?>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Copy</h3>
    <?php if (!empty($product['description'])): ?>
      <p class="mt-2 text-xs font-semibold uppercase text-slate-500">Description</p>
      <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $product['description'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if (!empty($product['specifications'])): ?>
      <p class="mt-4 text-xs font-semibold uppercase text-slate-500">Specifications</p>
      <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $product['specifications'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if (empty($product['description']) && empty($product['specifications'])): ?>
      <p class="mt-2 text-sm text-slate-500">No description or specs provided.</p>
    <?php endif; ?>
    <?php if (!empty($product['admin_note'])): ?>
      <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <p class="text-xs font-semibold uppercase text-amber-900">Admin note</p>
        <p class="mt-1 text-sm text-amber-950 whitespace-pre-wrap"><?= htmlspecialchars((string) $product['admin_note'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    <?php endif; ?>
    <?php if (!empty($product['reviewed_at'])): ?>
      <p class="mt-3 text-xs text-slate-500">Last reviewed <?= htmlspecialchars((string) $product['reviewed_at'], ENT_QUOTES, 'UTF-8') ?><?php if (!empty($product['reviewer_name'])): ?> · <?= htmlspecialchars((string) $product['reviewer_name'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?></p>
    <?php endif; ?>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Moderation</h3>
    <p class="mt-1 text-sm text-slate-500">Approve for the storefront, reject to send back, or remove if inappropriate.</p>

    <?php if ($status === 'pending_approval' || $status === 'rejected'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note</label>
          <textarea id="admin_note" name="admin_note" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve product</button>
          <button type="submit" name="action" value="reject" class="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Reject</button>
          <button type="submit" name="action" value="remove" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Remove this product?');">Remove</button>
        </div>
      </form>
    <?php elseif ($status === 'approved'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional)</label>
          <textarea id="admin_note" name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="remove" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Remove this product?');">Remove</button>
          <button type="submit" name="action" value="reject" class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reject instead</button>
        </div>
      </form>
    <?php elseif ($status === 'removed'): ?>
      <p class="mt-3 text-sm text-slate-600">This product was removed. Reopen to queue it again if needed.</p>
      <form method="post" class="mt-4">
        <button type="submit" name="action" value="reopen" class="rounded-xl border border-brand bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand/15">Reopen as pending</button>
      </form>
    <?php endif; ?>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

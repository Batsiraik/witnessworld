<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/push_triggers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: stores.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $note = trim((string) ($_POST['admin_note'] ?? ''));
    try {
        $st = $pdo->prepare(
            'SELECT id, moderation_status, user_id, name FROM stores WHERE id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $now = date('Y-m-d H:i:s');
            if ($action === 'approve') {
                $pdo->prepare(
                    'UPDATE stores SET moderation_status = ?, admin_note = NULL, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['approved', $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_store_review(
                    $pdo,
                    (int) $row['user_id'],
                    'approve',
                    (string) $row['name']
                );
            } elseif ($action === 'reject') {
                $pdo->prepare(
                    'UPDATE stores SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['rejected', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_store_review(
                    $pdo,
                    (int) $row['user_id'],
                    'reject',
                    (string) $row['name']
                );
            } elseif ($action === 'suspend') {
                $pdo->prepare(
                    'UPDATE stores SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['suspended', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
            } elseif ($action === 'reopen') {
                $pdo->prepare(
                    'UPDATE stores SET moderation_status = ?, admin_note = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL WHERE id = ?'
                )->execute(['pending_approval', $id]);
            }
        }
    } catch (Throwable) {
        header('Location: stores.php');
        exit;
    }
    header('Location: store.php?id=' . $id);
    exit;
}

$store = null;
try {
    $st = $pdo->prepare(
        'SELECT s.*, u.email, u.first_name, u.last_name, u.username, u.status AS user_status,
                a.name AS reviewer_name
         FROM stores s
         INNER JOIN users u ON u.id = s.user_id
         LEFT JOIN admins a ON a.id = s.reviewed_by_admin_id
         WHERE s.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $store = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    header('Location: stores.php');
    exit;
}
if (!$store) {
    header('Location: stores.php');
    exit;
}

$pageTitle = 'Store #' . $id;
$activeNav = 'stores';

$status = trim((string) ($store['moderation_status'] ?? ''));

$locLine = '';
$cn = trim((string) ($store['location_country_name'] ?? ''));
$cc = trim((string) ($store['location_country_code'] ?? ''));
$usState = trim((string) ($store['location_us_state'] ?? ''));
if ($cn !== '' || $cc !== '') {
    $locLine = $cn !== '' ? $cn : $cc;
    if ($usState !== '') {
        $locLine .= ' · ' . $usState;
    }
}

$delHuman = str_replace('_', ' ', (string) ($store['delivery_type'] ?? ''));

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="stores.php" class="font-semibold text-brand hover:underline">← Stores</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $store['name'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">#<?= (int) $store['id'] ?> · <?= htmlspecialchars($delHuman, ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div class="text-sm font-semibold text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars(str_replace('_', ' ', $status), ENT_QUOTES, 'UTF-8') ?></span></div>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Owner</h3>
    <p class="mt-2 text-sm text-slate-700">
      <?= htmlspecialchars(trim((string) $store['first_name'] . ' ' . (string) $store['last_name']), ENT_QUOTES, 'UTF-8') ?>
      <span class="text-slate-500">(@<?= htmlspecialchars((string) $store['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
    </p>
    <p class="text-sm text-slate-600"><?= htmlspecialchars((string) $store['email'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-3"><a class="text-sm font-semibold text-brand hover:underline" href="user.php?id=<?= (int) $store['user_id'] ?>">Open user profile</a></p>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Branding</h3>
    <div class="mt-4 flex flex-wrap gap-6">
      <?php if (!empty($store['logo_url'])): ?>
        <div>
          <p class="text-xs font-semibold uppercase text-slate-500">Logo</p>
          <a href="<?= htmlspecialchars((string) $store['logo_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="mt-2 block">
            <img src="<?= htmlspecialchars((string) $store['logo_url'], ENT_QUOTES, 'UTF-8') ?>" alt="Logo" class="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-100" loading="lazy" />
          </a>
        </div>
      <?php endif; ?>
      <?php if (!empty($store['banner_url'])): ?>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase text-slate-500">Banner</p>
          <a href="<?= htmlspecialchars((string) $store['banner_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="mt-2 block">
            <img src="<?= htmlspecialchars((string) $store['banner_url'], ENT_QUOTES, 'UTF-8') ?>" alt="Banner" class="max-h-40 w-full max-w-xl rounded-xl object-cover ring-1 ring-slate-100" loading="lazy" />
          </a>
        </div>
      <?php endif; ?>
    </div>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Details</h3>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-slate-500">What they sell (summary)</dt>
        <dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $store['sells_summary'], ENT_QUOTES, 'UTF-8') ?></dd>
      </div>
      <div>
        <dt class="text-slate-500">Location</dt>
        <dd class="font-medium text-slate-900"><?= $locLine !== '' ? htmlspecialchars($locLine, ENT_QUOTES, 'UTF-8') : '—' ?></dd>
      </div>
      <div>
        <dt class="text-slate-500">Delivery</dt>
        <dd class="font-medium text-slate-900"><?= htmlspecialchars($delHuman, ENT_QUOTES, 'UTF-8') ?></dd>
      </div>
      <?php if (!empty($store['delivery_notes'])): ?>
        <div class="sm:col-span-2">
          <dt class="text-slate-500">Delivery notes</dt>
          <dd class="font-medium text-slate-900 whitespace-pre-wrap"><?= htmlspecialchars((string) $store['delivery_notes'], ENT_QUOTES, 'UTF-8') ?></dd>
        </div>
      <?php endif; ?>
      <div><dt class="text-slate-500">Created</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $store['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
    </dl>
    <div class="mt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
      <p class="mt-2 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $store['description'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <?php if (!empty($store['admin_note'])): ?>
      <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <p class="text-xs font-semibold uppercase text-amber-900">Admin note</p>
        <p class="mt-1 text-sm text-amber-950 whitespace-pre-wrap"><?= htmlspecialchars((string) $store['admin_note'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    <?php endif; ?>
    <?php if (!empty($store['reviewed_at'])): ?>
      <p class="mt-3 text-xs text-slate-500">Last reviewed <?= htmlspecialchars((string) $store['reviewed_at'], ENT_QUOTES, 'UTF-8') ?><?php if (!empty($store['reviewer_name'])): ?> · <?= htmlspecialchars((string) $store['reviewer_name'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?></p>
    <?php endif; ?>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Moderation</h3>
    <p class="mt-1 text-sm text-slate-500">Approve so the owner can add products. Suspend to block the storefront without deleting it.</p>

    <?php if ($status === 'pending_approval'): ?>
      <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
        <p class="font-semibold">This store is waiting for approval</p>
        <p class="mt-1">Use the green <span class="font-semibold">Approve store</span> button below to allow the seller to add products.</p>
      </div>
    <?php elseif ($status === 'rejected'): ?>
      <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <p class="font-semibold">Rejected — you can still approve if the seller fixed their submission</p>
        <p class="mt-1">Use <span class="font-semibold">Approve store</span> below, or leave a note and reject again.</p>
      </div>
    <?php endif; ?>

    <?php if ($status === 'pending_approval' || $status === 'rejected'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional for approve; recommended for reject / suspend)</label>
          <textarea id="admin_note" name="admin_note" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve store</button>
          <button type="submit" name="action" value="reject" class="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Reject</button>
          <button type="submit" name="action" value="suspend" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Suspend this store? The owner cannot add products until you reopen it.');">Suspend</button>
        </div>
      </form>
    <?php elseif ($status === 'approved'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional)</label>
          <textarea id="admin_note" name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="suspend" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Suspend this store?');">Suspend store</button>
          <button type="submit" name="action" value="reject" class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reject instead</button>
        </div>
      </form>
    <?php elseif ($status === 'suspended'): ?>
      <p class="mt-3 text-sm text-slate-600">This store is suspended. The owner cannot manage products until it is sent back to the queue.</p>
      <form method="post" class="mt-4">
        <button type="submit" name="action" value="reopen" class="rounded-xl border border-brand bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand/15">Reopen as pending</button>
      </form>
    <?php else: ?>
      <p class="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        Unrecognized status <code class="rounded bg-white px-1.5 py-0.5"><?= htmlspecialchars($status !== '' ? $status : '(empty)', ENT_QUOTES, 'UTF-8') ?></code>.
        Check the database column <code class="rounded bg-white px-1.5 py-0.5">stores.moderation_status</code>.
      </p>
    <?php endif; ?>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

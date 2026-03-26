<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/push_triggers.php';
require_once __DIR__ . '/../api/lib/directory_helpers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: directory.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $note = trim((string) ($_POST['admin_note'] ?? ''));
    try {
        $st = $pdo->prepare(
            'SELECT id, moderation_status, user_id, business_name FROM directory_entries WHERE id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $now = date('Y-m-d H:i:s');
            if ($action === 'approve') {
                $pdo->prepare(
                    'UPDATE directory_entries SET moderation_status = ?, admin_note = NULL, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['approved', $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_directory_review(
                    $pdo,
                    (int) $row['user_id'],
                    'approve',
                    (string) $row['business_name']
                );
            } elseif ($action === 'reject') {
                $pdo->prepare(
                    'UPDATE directory_entries SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['rejected', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_directory_review(
                    $pdo,
                    (int) $row['user_id'],
                    'reject',
                    (string) $row['business_name']
                );
            } elseif ($action === 'suspend') {
                $pdo->prepare(
                    'UPDATE directory_entries SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['suspended', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
            } elseif ($action === 'reopen') {
                $pdo->prepare(
                    'UPDATE directory_entries SET moderation_status = ?, admin_note = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL WHERE id = ?'
                )->execute(['pending_approval', $id]);
            }
        }
    } catch (Throwable) {
        header('Location: directory.php');
        exit;
    }
    $returnTo = trim((string) ($_POST['return_to'] ?? ''));
    if ($returnTo === 'list') {
        header('Location: directory.php?moderated=1');
        exit;
    }
    header('Location: directory_entry.php?id=' . $id);
    exit;
}

$entry = null;
try {
    $st = $pdo->prepare(
        'SELECT d.*, u.email, u.first_name, u.last_name, u.username, u.status AS user_status,
                a.name AS reviewer_name
         FROM directory_entries d
         INNER JOIN users u ON u.id = d.user_id
         LEFT JOIN admins a ON a.id = d.reviewed_by_admin_id
         WHERE d.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $entry = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    header('Location: directory.php');
    exit;
}
if (!$entry) {
    header('Location: directory.php');
    exit;
}

$pageTitle = 'Directory · ' . (string) $entry['business_name'];
$activeNav = 'directory';

$status = trim((string) ($entry['moderation_status'] ?? ''));
$cats = ww_directory_categories();
$catLabel = $cats[(string) $entry['category']] ?? (string) $entry['category'];

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="directory.php" class="font-semibold text-brand hover:underline">← Directory</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $entry['business_name'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">#<?= (int) $entry['id'] ?> · <?= htmlspecialchars($catLabel, ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div class="text-sm font-semibold text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars(str_replace('_', ' ', $status), ENT_QUOTES, 'UTF-8') ?></span></div>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Owner</h3>
    <p class="mt-2 text-sm text-slate-700">
      <?= htmlspecialchars(trim((string) $entry['first_name'] . ' ' . (string) $entry['last_name']), ENT_QUOTES, 'UTF-8') ?>
      <span class="text-slate-500">(@<?= htmlspecialchars((string) $entry['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
    </p>
    <p class="text-sm text-slate-600"><?= htmlspecialchars((string) $entry['email'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-3"><a class="text-sm font-semibold text-brand hover:underline" href="user.php?id=<?= (int) $entry['user_id'] ?>">Open user profile</a></p>
  </div>

  <?php if (!empty($entry['logo_url'])): ?>
    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <h3 class="text-sm font-semibold text-slate-900">Logo</h3>
      <a href="<?= htmlspecialchars((string) $entry['logo_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="mt-3 inline-block">
        <img src="<?= htmlspecialchars((string) $entry['logo_url'], ENT_QUOTES, 'UTF-8') ?>" alt="" class="h-24 w-24 rounded-xl object-cover ring-1 ring-slate-100" loading="lazy" />
      </a>
    </div>
  <?php endif; ?>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Contact & location (public)</h3>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div><dt class="text-slate-500">Phone</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $entry['phone'], ENT_QUOTES, 'UTF-8') ?></dd></div>
      <div><dt class="text-slate-500">Email</dt><dd class="font-medium text-slate-900 break-all"><?= htmlspecialchars((string) $entry['email'], ENT_QUOTES, 'UTF-8') ?></dd></div>
      <?php if (!empty($entry['website'])): ?>
        <div class="sm:col-span-2"><dt class="text-slate-500">Website</dt><dd><a class="font-semibold text-brand break-all hover:underline" href="<?= htmlspecialchars((string) $entry['website'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener"><?= htmlspecialchars((string) $entry['website'], ENT_QUOTES, 'UTF-8') ?></a></dd></div>
      <?php endif; ?>
      <?php if (!empty($entry['map_url'])): ?>
        <div class="sm:col-span-2"><dt class="text-slate-500">Map</dt><dd><a class="font-semibold text-brand break-all hover:underline" href="<?= htmlspecialchars((string) $entry['map_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener"><?= htmlspecialchars((string) $entry['map_url'], ENT_QUOTES, 'UTF-8') ?></a></dd></div>
      <?php endif; ?>
      <div class="sm:col-span-2">
        <dt class="text-slate-500">Address</dt>
        <dd class="font-medium text-slate-900">
          <?php
            $parts = array_filter([
                $entry['address_line'] ? (string) $entry['address_line'] : '',
                (string) $entry['city'],
                $entry['postal_code'] ? (string) $entry['postal_code'] : '',
                $entry['location_us_state'] ? (string) $entry['location_us_state'] : '',
                (string) $entry['location_country_name'],
            ]);
            echo htmlspecialchars(implode(' · ', $parts), ENT_QUOTES, 'UTF-8');
          ?>
        </dd>
      </div>
      <div><dt class="text-slate-500">Created</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $entry['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
    </dl>
    <?php if (!empty($entry['tagline'])): ?>
      <p class="mt-4 text-sm font-medium text-slate-800"><?= htmlspecialchars((string) $entry['tagline'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if (!empty($entry['description'])): ?>
      <p class="mt-3 text-xs font-semibold uppercase text-slate-500">Description</p>
      <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $entry['description'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if (!empty($entry['hours_text'])): ?>
      <p class="mt-4 text-xs font-semibold uppercase text-slate-500">Hours</p>
      <p class="mt-1 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $entry['hours_text'], ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if (!empty($entry['admin_note'])): ?>
      <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <p class="text-xs font-semibold uppercase text-amber-900">Admin note</p>
        <p class="mt-1 text-sm text-amber-950 whitespace-pre-wrap"><?= htmlspecialchars((string) $entry['admin_note'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    <?php endif; ?>
    <?php if (!empty($entry['reviewed_at'])): ?>
      <p class="mt-3 text-xs text-slate-500">Last reviewed <?= htmlspecialchars((string) $entry['reviewed_at'], ENT_QUOTES, 'UTF-8') ?><?php if (!empty($entry['reviewer_name'])): ?> · <?= htmlspecialchars((string) $entry['reviewer_name'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?></p>
    <?php endif; ?>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Moderation</h3>
    <p class="mt-1 text-sm text-slate-500">Approve to show in the app directory. Suspend to hide without deleting.</p>

    <?php if ($status === 'pending_approval'): ?>
      <div class="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950">
        <p class="font-semibold">Pending approval</p>
        <p class="mt-1">Use <span class="font-semibold">Approve listing</span> below to publish to the directory.</p>
      </div>
    <?php elseif ($status === 'rejected'): ?>
      <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
        <p class="font-semibold">Rejected</p>
        <p class="mt-1">You can approve if the owner corrected their submission.</p>
      </div>
    <?php endif; ?>

    <?php if ($status === 'pending_approval' || $status === 'rejected'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note</label>
          <textarea id="admin_note" name="admin_note" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve listing</button>
          <button type="submit" name="action" value="reject" class="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Reject</button>
          <button type="submit" name="action" value="suspend" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Suspend this listing?');">Suspend</button>
        </div>
      </form>
    <?php elseif ($status === 'approved'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional)</label>
          <textarea id="admin_note" name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="suspend" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Suspend?');">Suspend</button>
          <button type="submit" name="action" value="reject" class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reject instead</button>
        </div>
      </form>
    <?php elseif ($status === 'suspended'): ?>
      <p class="mt-3 text-sm text-slate-600">Suspended — not shown in the directory.</p>
      <form method="post" class="mt-4">
        <button type="submit" name="action" value="reopen" class="rounded-xl border border-brand bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand/15">Reopen as pending</button>
      </form>
    <?php else: ?>
      <p class="mt-3 text-sm text-amber-800">Unknown status. Check database.</p>
    <?php endif; ?>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/push_triggers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: listings.php');
    exit;
}

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $note = trim((string) ($_POST['admin_note'] ?? ''));
    try {
        $st = $pdo->prepare(
            'SELECT l.id, l.moderation_status, l.user_id, l.title, l.listing_type FROM listings l WHERE l.id = ? LIMIT 1'
        );
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            $now = date('Y-m-d H:i:s');
            if ($action === 'approve') {
                $pdo->prepare(
                    'UPDATE listings SET moderation_status = ?, admin_note = NULL, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['approved', $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_listing_review(
                    $pdo,
                    (int) $row['user_id'],
                    'approve',
                    (string) $row['listing_type'],
                    (string) $row['title']
                );
            } elseif ($action === 'reject') {
                $pdo->prepare(
                    'UPDATE listings SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['rejected', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
                ww_admin_notify_listing_review(
                    $pdo,
                    (int) $row['user_id'],
                    'reject',
                    (string) $row['listing_type'],
                    (string) $row['title']
                );
            } elseif ($action === 'remove') {
                $pdo->prepare(
                    'UPDATE listings SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
                )->execute(['removed', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
            } elseif ($action === 'reopen') {
                $pdo->prepare(
                    'UPDATE listings SET moderation_status = ?, admin_note = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL WHERE id = ?'
                )->execute(['pending_approval', $id]);
            }
        }
    } catch (Throwable) {
        header('Location: listings.php');
        exit;
    }
    header('Location: listing.php?id=' . $id);
    exit;
}

$listing = null;
try {
    $st = $pdo->prepare(
        'SELECT l.*, u.email, u.first_name, u.last_name, u.username, u.status AS user_status,
                a.name AS reviewer_name
         FROM listings l
         INNER JOIN users u ON u.id = l.user_id
         LEFT JOIN admins a ON a.id = l.reviewed_by_admin_id
         WHERE l.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $listing = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    header('Location: listings.php');
    exit;
}
if (!$listing) {
    header('Location: listings.php');
    exit;
}

$pageTitle = 'Listing #' . $id;
$activeNav = 'listings';

$status = (string) ($listing['moderation_status'] ?? '');

$portfolioUrls = [];
if (!empty($listing['portfolio_urls_json'])) {
    $decoded = json_decode((string) $listing['portfolio_urls_json'], true);
    if (is_array($decoded)) {
        foreach ($decoded as $u) {
            if (is_string($u) && $u !== '') {
                $portfolioUrls[] = $u;
            }
        }
    }
}

$softSkills = [];
if (!empty($listing['soft_skills_json'])) {
    $decSkills = json_decode((string) $listing['soft_skills_json'], true);
    if (is_array($decSkills)) {
        foreach ($decSkills as $s) {
            if (is_string($s) && $s !== '') {
                $softSkills[] = $s;
            }
        }
    }
}

$locLine = '';
$cn = trim((string) ($listing['location_country_name'] ?? ''));
$cc = trim((string) ($listing['location_country_code'] ?? ''));
$usState = trim((string) ($listing['location_us_state'] ?? ''));
if ($cn !== '' || $cc !== '') {
    $locLine = $cn !== '' ? $cn : $cc;
    if ($usState !== '') {
        $locLine .= ' · ' . $usState;
    }
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="listings.php" class="font-semibold text-brand hover:underline">← Listings</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $listing['title'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">#<?= (int) $listing['id'] ?> · <?= htmlspecialchars((string) $listing['listing_type'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div class="text-sm font-semibold text-slate-700">Status: <span class="text-brand"><?= htmlspecialchars(str_replace('_', ' ', $status), ENT_QUOTES, 'UTF-8') ?></span></div>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Seller</h3>
    <p class="mt-2 text-sm text-slate-700">
      <?= htmlspecialchars(trim((string) $listing['first_name'] . ' ' . (string) $listing['last_name']), ENT_QUOTES, 'UTF-8') ?>
      <span class="text-slate-500">(@<?= htmlspecialchars((string) $listing['username'], ENT_QUOTES, 'UTF-8') ?>)</span>
    </p>
    <p class="text-sm text-slate-600"><?= htmlspecialchars((string) $listing['email'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-2 text-xs text-slate-500">Account status: <?= htmlspecialchars((string) $listing['user_status'], ENT_QUOTES, 'UTF-8') ?></p>
    <p class="mt-3"><a class="text-sm font-semibold text-brand hover:underline" href="user.php?id=<?= (int) $listing['user_id'] ?>">Open user profile</a></p>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Details</h3>
    <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt class="text-slate-500">Location</dt>
        <dd class="font-medium text-slate-900">
          <?= $locLine !== '' ? htmlspecialchars($locLine, ENT_QUOTES, 'UTF-8') : '—' ?>
        </dd>
      </div>
      <div>
        <dt class="text-slate-500">Pricing</dt>
        <dd class="font-medium text-slate-900">
          <?php
            $pt = (string) $listing['pricing_type'];
            $pa = $listing['price_amount'];
            if ($pt === 'none' || $pa === null) {
                echo '—';
            } else {
                echo htmlspecialchars((string) $listing['currency'] . ' ' . number_format((float) $pa, 2), ENT_QUOTES, 'UTF-8');
                echo $pt === 'hourly' ? ' / hour' : ' fixed';
            }
          ?>
        </dd>
      </div>
      <div><dt class="text-slate-500">Created</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $listing['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
      <?php if (!empty($listing['media_url'])): ?>
        <div class="sm:col-span-2">
          <dt class="text-slate-500">Main image</dt>
          <dd class="mt-1"><a class="font-semibold text-brand break-all hover:underline" href="<?= htmlspecialchars((string) $listing['media_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener"><?= htmlspecialchars((string) $listing['media_url'], ENT_QUOTES, 'UTF-8') ?></a></dd>
        </div>
      <?php endif; ?>
      <?php if (!empty($listing['video_url'])): ?>
        <div class="sm:col-span-2">
          <dt class="text-slate-500">Video</dt>
          <dd class="mt-1"><a class="font-semibold text-brand break-all hover:underline" href="<?= htmlspecialchars((string) $listing['video_url'], ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener"><?= htmlspecialchars((string) $listing['video_url'], ENT_QUOTES, 'UTF-8') ?></a></dd>
        </div>
      <?php endif; ?>
    </dl>
    <?php if ($softSkills !== []): ?>
      <div class="mt-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Soft skills</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <?php foreach ($softSkills as $sk): ?>
            <span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800 ring-1 ring-inset ring-slate-200"><?= htmlspecialchars($sk, ENT_QUOTES, 'UTF-8') ?></span>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>

    <?php if ($portfolioUrls !== []): ?>
      <div class="mt-4">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-3">
          <?php foreach ($portfolioUrls as $pu): ?>
            <a href="<?= htmlspecialchars($pu, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="block overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
              <img src="<?= htmlspecialchars($pu, ENT_QUOTES, 'UTF-8') ?>" alt="Portfolio" class="h-40 w-full object-cover" loading="lazy" />
            </a>
          <?php endforeach; ?>
        </div>
      </div>
    <?php endif; ?>

    <div class="mt-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Description</p>
      <p class="mt-2 whitespace-pre-wrap text-sm text-slate-800"><?= htmlspecialchars((string) $listing['description'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <?php if (!empty($listing['admin_note'])): ?>
      <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
        <p class="text-xs font-semibold uppercase text-amber-900">Admin note</p>
        <p class="mt-1 text-sm text-amber-950 whitespace-pre-wrap"><?= htmlspecialchars((string) $listing['admin_note'], ENT_QUOTES, 'UTF-8') ?></p>
      </div>
    <?php endif; ?>
    <?php if (!empty($listing['reviewed_at'])): ?>
      <p class="mt-3 text-xs text-slate-500">Last reviewed <?= htmlspecialchars((string) $listing['reviewed_at'], ENT_QUOTES, 'UTF-8') ?><?php if (!empty($listing['reviewer_name'])): ?> · <?= htmlspecialchars((string) $listing['reviewer_name'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?></p>
    <?php endif; ?>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h3 class="text-sm font-semibold text-slate-900">Moderation</h3>
    <p class="mt-1 text-sm text-slate-500">Approve to publish, reject to send back, or remove if content is inappropriate.</p>

    <?php if ($status === 'pending_approval' || $status === 'rejected'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional for approve; recommended for reject)</label>
          <textarea id="admin_note" name="admin_note" rows="3" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Visible in admin history; optional message for internal use"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve listing</button>
          <button type="submit" name="action" value="reject" class="rounded-xl bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">Reject</button>
          <button type="submit" name="action" value="remove" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Remove this listing as inappropriate? It will be hidden from the marketplace.');">Remove (inappropriate)</button>
        </div>
      </form>
    <?php elseif ($status === 'approved'): ?>
      <form method="post" class="mt-4 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600" for="admin_note">Note (optional)</label>
          <textarea id="admin_note" name="admin_note" rows="2" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        </div>
        <div class="flex flex-wrap gap-3">
          <button type="submit" name="action" value="remove" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Remove this listing?');">Remove from marketplace</button>
          <button type="submit" name="action" value="reject" class="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50">Reject instead</button>
        </div>
      </form>
    <?php elseif ($status === 'removed'): ?>
      <p class="mt-3 text-sm text-slate-600">This listing was removed. You can send it back to the pending queue for re-review if needed.</p>
      <form method="post" class="mt-4">
        <button type="submit" name="action" value="reopen" class="rounded-xl border border-brand bg-brand/10 px-5 py-2.5 text-sm font-semibold text-brand-dark hover:bg-brand/15">Reopen as pending</button>
      </form>
    <?php endif; ?>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

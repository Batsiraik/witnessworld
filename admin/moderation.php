<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Content reports';
$activeNav = 'moderation';

$pdo = witnessworld_pdo();
$flash = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $reportId = (int) ($_POST['report_id'] ?? 0);
    $note = trim((string) ($_POST['admin_resolution_note'] ?? ''));
    $adminId = (int) ($_SESSION['admin_id'] ?? 0);

    if ($reportId > 0 && ($action === 'dismiss' || $action === 'resolve')) {
        try {
            $now = date('Y-m-d H:i:s');
            $status = $action === 'dismiss' ? 'dismissed' : 'reviewed';
            $pdo->prepare(
                'UPDATE content_reports SET status = ?, admin_resolution_note = ?, resolved_at = ?, resolved_by_admin_id = ? WHERE id = ? AND status = ?'
            )->execute([$status, $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $reportId, 'open']);
            $flash = 'Report updated.';
        } catch (Throwable) {
            $flash = 'Could not update report. See database/README.md.';
        }
    }
}

$filter = (string) ($_GET['status'] ?? 'open');
if (!in_array($filter, ['open', 'reviewed', 'dismissed', 'all'], true)) {
    $filter = 'open';
}

$sql = 'SELECT r.id, r.subject_type, r.subject_id, r.reason, r.status, r.created_at, r.admin_resolution_note,
        l.title AS listing_title, l.moderation_status AS listing_mod,
        s.name AS store_name, s.moderation_status AS store_mod,
        p.name AS product_name, p.moderation_status AS product_mod,
        d.business_name AS directory_name, d.moderation_status AS directory_mod,
        u.email AS reporter_email, u.username AS reporter_username
        FROM content_reports r
        LEFT JOIN listings l ON r.subject_type = \'listing\' AND l.id = r.subject_id
        LEFT JOIN stores s ON r.subject_type = \'store\' AND s.id = r.subject_id
        LEFT JOIN store_products p ON r.subject_type = \'product\' AND p.id = r.subject_id
        LEFT JOIN directory_entries d ON r.subject_type = \'directory_entry\' AND d.id = r.subject_id
        LEFT JOIN users u ON u.id = r.reporter_user_id';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE r.status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY r.id DESC';

$rows = [];
$moderationDbError = null;
try {
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    $moderationDbError = 'content_reports table missing. See database/README.md.';
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'moderation.php' : $base . '/moderation.php';
$chip = static function (string $key, string $label, string $cur) use ($self): string {
    $qs = $key === 'open' ? '' : ('?status=' . urlencode($key));
    $active = $cur === $key;
    $cls = $active
        ? 'border-brand bg-brand/10 text-brand-dark ring-1 ring-brand/30'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';

    return '<a href="' . htmlspecialchars($self . $qs, ENT_QUOTES, 'UTF-8') . '" class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ' . $cls . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
};

$subject_link = static function (array $r) use ($base): string {
    $type = (string) ($r['subject_type'] ?? '');
    $sid = (int) ($r['subject_id'] ?? 0);
    $pref = ($base === '' || $base === '.') ? '' : $base . '/';
    if ($type === 'listing') {
        return $pref . 'listing.php?id=' . $sid;
    }
    if ($type === 'store') {
        return $pref . 'store.php?id=' . $sid;
    }
    if ($type === 'product') {
        return $pref . 'store_product.php?id=' . $sid;
    }
    if ($type === 'directory_entry') {
        return $pref . 'directory_entry.php?id=' . $sid;
    }
    return '#';
};

$subject_label = static function (array $r): string {
    $type = (string) ($r['subject_type'] ?? '');
    if ($type === 'listing') {
        return (string) ($r['listing_title'] ?? '') !== '' ? (string) $r['listing_title'] : 'Listing #' . (int) $r['subject_id'];
    }
    if ($type === 'store') {
        return (string) ($r['store_name'] ?? '') !== '' ? (string) $r['store_name'] : 'Store #' . (int) $r['subject_id'];
    }
    if ($type === 'product') {
        return (string) ($r['product_name'] ?? '') !== '' ? (string) $r['product_name'] : 'Product #' . (int) $r['subject_id'];
    }
    if ($type === 'directory_entry') {
        return (string) ($r['directory_name'] ?? '') !== '' ? (string) $r['directory_name'] : 'Directory #' . (int) $r['subject_id'];
    }
    return $type . ' #' . (int) $r['subject_id'];
};

$subject_mod = static function (array $r): string {
    $type = (string) ($r['subject_type'] ?? '');
    if ($type === 'listing') {
        return (string) ($r['listing_mod'] ?? '—');
    }
    if ($type === 'store') {
        return (string) ($r['store_mod'] ?? '—');
    }
    if ($type === 'product') {
        return (string) ($r['product_mod'] ?? '—');
    }
    if ($type === 'directory_entry') {
        return (string) ($r['directory_mod'] ?? '—');
    }
    return '—';
};

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>
<?php if (!empty($moderationDbError)): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($moderationDbError, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">Content reports</h2>
      <p class="text-sm text-slate-500">Member reports for listings, stores, products, and directory entries. Review the underlying content in admin, then resolve or dismiss here.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $chip('open', 'Open', $filter) ?>
      <?= $chip('reviewed', 'Reviewed', $filter) ?>
      <?= $chip('dismissed', 'Dismissed', $filter) ?>
      <?= $chip('all', 'All', $filter) ?>
    </div>
  </div>
  <div class="divide-y divide-slate-100">
    <?php foreach ($rows as $r): ?>
      <div class="px-6 py-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-900">Report #<?= (int) $r['id'] ?></p>
            <p class="mt-1 text-xs text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?> · Status: <?= htmlspecialchars((string) $r['status'], ENT_QUOTES, 'UTF-8') ?></p>
          </div>
          <a class="text-sm font-semibold text-brand hover:underline" href="<?= htmlspecialchars($subject_link($r), ENT_QUOTES, 'UTF-8') ?>">Open in admin</a>
        </div>
        <p class="mt-3 text-sm text-slate-800">
          <span class="font-semibold text-slate-600"><?= htmlspecialchars((string) $r['subject_type'], ENT_QUOTES, 'UTF-8') ?>:</span>
          <?= htmlspecialchars($subject_label($r), ENT_QUOTES, 'UTF-8') ?>
          <span class="text-slate-400">(#<?= (int) $r['subject_id'] ?>)</span>
        </p>
        <p class="mt-1 text-xs text-slate-500">Subject moderation: <?= htmlspecialchars($subject_mod($r), ENT_QUOTES, 'UTF-8') ?></p>
        <p class="mt-3 text-sm text-slate-700 whitespace-pre-wrap"><?= htmlspecialchars((string) $r['reason'], ENT_QUOTES, 'UTF-8') ?></p>
        <?php if (!empty($r['reporter_email']) || !empty($r['reporter_username'])): ?>
          <p class="mt-2 text-xs text-slate-500">Reporter: <?= htmlspecialchars((string) ($r['reporter_username'] ?: $r['reporter_email']), ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
        <?php if (!empty($r['admin_resolution_note'])): ?>
          <p class="mt-2 text-xs text-slate-600"><span class="font-semibold">Resolution:</span> <?= htmlspecialchars((string) $r['admin_resolution_note'], ENT_QUOTES, 'UTF-8') ?></p>
        <?php endif; ?>
        <?php if ((string) $r['status'] === 'open'): ?>
          <form method="post" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <input type="hidden" name="report_id" value="<?= (int) $r['id'] ?>" />
            <div class="flex-1 min-w-0">
              <label class="block text-xs font-semibold text-slate-600">Admin note (optional)</label>
              <input type="text" name="admin_resolution_note" class="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Internal note" />
            </div>
            <button type="submit" name="action" value="resolve" class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Mark reviewed</button>
            <button type="submit" name="action" value="dismiss" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">Dismiss</button>
          </form>
        <?php endif; ?>
      </div>
    <?php endforeach; ?>
    <?php if ($rows === []): ?>
      <p class="px-6 py-10 text-center text-sm text-slate-500">No reports in this filter.</p>
    <?php endif; ?>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

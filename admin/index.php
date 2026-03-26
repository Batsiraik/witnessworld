<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/db_status.php';

$pageTitle = 'Dashboard';
$activeNav = 'dashboard';
$dbStatus = witnessworld_db_status();

$pdo = witnessworld_pdo();
$counts = [
    'users' => (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn(),
    'pending' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'pending_verification'")->fetchColumn(),
    'verified' => (int) $pdo->query("SELECT COUNT(*) FROM users WHERE status = 'verified'")->fetchColumn(),
];
$listingsPending = 0;
$reportsOpen = 0;
try {
    $listingsPending = (int) $pdo->query(
        "SELECT COUNT(*) FROM listings WHERE moderation_status = 'pending_approval'"
    )->fetchColumn();
} catch (Throwable) {
    $listingsPending = 0;
}
try {
    $reportsOpen = (int) $pdo->query("SELECT COUNT(*) FROM content_reports WHERE status = 'open'")->fetchColumn();
} catch (Throwable) {
    $reportsOpen = 0;
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="grid gap-6 lg:grid-cols-3">
  <div class="lg:col-span-2 space-y-6">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">App users</p>
        <p class="mt-2 text-3xl font-bold text-slate-900"><?= (int) $counts['users'] ?></p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Users awaiting review</p>
        <p class="mt-2 text-3xl font-bold text-amber-600"><?= (int) $counts['pending'] ?></p>
        <a class="mt-2 inline-block text-xs font-semibold text-brand hover:underline" href="users.php?status=pending_verification">Filter pending →</a>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Verified users</p>
        <p class="mt-2 text-3xl font-bold text-emerald-600"><?= (int) $counts['verified'] ?></p>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Gigs pending approval</p>
        <p class="mt-2 text-3xl font-bold text-amber-600"><?= (int) $listingsPending ?></p>
        <a class="mt-2 inline-block text-xs font-semibold text-brand hover:underline" href="listings.php?status=pending_approval">Review listings →</a>
      </div>
      <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Open content reports</p>
        <p class="mt-2 text-3xl font-bold text-red-600"><?= (int) $reportsOpen ?></p>
        <a class="mt-2 inline-block text-xs font-semibold text-brand hover:underline" href="moderation.php">Moderation →</a>
      </div>
    </div>

    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <h2 class="text-base font-semibold text-slate-900">Overview</h2>
      <p class="mt-2 text-sm leading-relaxed text-slate-600">
        Review new signups under <a class="font-semibold text-brand" href="users.php?status=pending_verification">App users</a> and approve gigs under
        <a class="font-semibold text-brand" href="listings.php?status=pending_approval">Listings &amp; gigs</a>. Handle reports in
        <a class="font-semibold text-brand" href="moderation.php">Content reports</a>. Metrics live in
        <a class="font-semibold text-brand" href="analytics.php">Analytics</a>; questionnaire and email in
        <a class="font-semibold text-brand" href="settings.php">Settings</a>.
      </p>
    </div>
  </div>

  <div class="space-y-6">
    <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
      <h2 class="text-sm font-semibold text-slate-900">Database</h2>
      <div class="mt-4 flex items-start gap-3">
        <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full <?= $dbStatus['ok'] ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-700' ?>">
          <?php if ($dbStatus['ok']): ?>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          <?php else: ?>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
          <?php endif; ?>
        </span>
        <div>
          <p class="text-sm font-medium <?= $dbStatus['ok'] ? 'text-emerald-800' : 'text-amber-900' ?>">
            <?= $dbStatus['ok'] ? 'Connected' : 'Not connected' ?>
          </p>
          <p class="mt-1 text-xs text-slate-600 leading-relaxed"><?= htmlspecialchars($dbStatus['message'], ENT_QUOTES, 'UTF-8') ?></p>
        </div>
      </div>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

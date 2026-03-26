<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Analytics';
$activeNav = 'analytics';

$pdo = witnessworld_pdo();

$scalar = static function (PDO $pdo, string $sql): int {
    return (int) $pdo->query($sql)->fetchColumn();
};

$usersByStatus = $pdo->query(
    "SELECT status, COUNT(*) AS c FROM users GROUP BY status ORDER BY c DESC"
)->fetchAll(PDO::FETCH_KEY_PAIR);

$listingsByStatus = [];
try {
    $listingsByStatus = $pdo->query(
        "SELECT moderation_status, COUNT(*) AS c FROM listings GROUP BY moderation_status ORDER BY c DESC"
    )->fetchAll(PDO::FETCH_KEY_PAIR);
} catch (Throwable) {
    $listingsByStatus = [];
}

$openReports = 0;
try {
    $openReports = $scalar($pdo, "SELECT COUNT(*) FROM content_reports WHERE status = 'open'");
} catch (Throwable) {
    $openReports = 0;
}

$newUsers7d = $scalar(
    $pdo,
    "SELECT COUNT(*) FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
);
$newListings7d = 0;
try {
    $newListings7d = $scalar(
        $pdo,
        "SELECT COUNT(*) FROM listings WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)"
    );
} catch (Throwable) {
    $newListings7d = 0;
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div>
    <h2 class="text-base font-semibold text-slate-900">Analytics</h2>
    <p class="text-sm text-slate-500">High-level counts for users, listings, and reports. Deeper funnels can be added as the app grows.</p>
  </div>

  <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500">New users (7d)</p>
      <p class="mt-2 text-3xl font-bold text-slate-900"><?= (int) $newUsers7d ?></p>
    </div>
    <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500">New listings (7d)</p>
      <p class="mt-2 text-3xl font-bold text-slate-900"><?= (int) $newListings7d ?></p>
    </div>
    <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
      <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Open reports</p>
      <p class="mt-2 text-3xl font-bold text-amber-600"><?= (int) $openReports ?></p>
      <a class="mt-2 inline-block text-xs font-semibold text-brand hover:underline" href="moderation.php">Review queue →</a>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <h3 class="text-sm font-semibold text-slate-900">Users by status</h3>
      <ul class="mt-4 space-y-2 text-sm">
        <?php foreach ($usersByStatus as $st => $c): ?>
          <li class="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
            <span class="text-slate-600"><?= htmlspecialchars((string) $st, ENT_QUOTES, 'UTF-8') ?></span>
            <span class="font-semibold text-slate-900"><?= (int) $c ?></span>
          </li>
        <?php endforeach; ?>
        <?php if ($usersByStatus === []): ?>
          <li class="text-slate-500">No data.</li>
        <?php endif; ?>
      </ul>
    </div>
    <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
      <h3 class="text-sm font-semibold text-slate-900">Listings by moderation</h3>
      <ul class="mt-4 space-y-2 text-sm">
        <?php foreach ($listingsByStatus as $st => $c): ?>
          <li class="flex justify-between gap-4 border-b border-slate-100 py-2 last:border-0">
            <span class="text-slate-600"><?= htmlspecialchars(str_replace('_', ' ', (string) $st), ENT_QUOTES, 'UTF-8') ?></span>
            <span class="font-semibold text-slate-900"><?= (int) $c ?></span>
          </li>
        <?php endforeach; ?>
        <?php if ($listingsByStatus === []): ?>
          <li class="text-slate-500">No listings yet — if you see DB errors, see database/README.md.</li>
        <?php endif; ?>
      </ul>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

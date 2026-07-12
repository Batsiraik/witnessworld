<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Export data';
$activeNav = 'dashboard';

$period = strtolower(trim((string) ($_GET['period'] ?? 'month')));
if (!in_array($period, ['day', 'week', 'month'], true)) {
    $period = 'month';
}

$anchorRaw = trim((string) ($_GET['date'] ?? ''));
$anchor = DateTimeImmutable::createFromFormat('!Y-m-d', $anchorRaw !== '' ? $anchorRaw : date('Y-m-d'));
if (!$anchor) {
    $anchor = new DateTimeImmutable('today');
}

[$from, $toExclusive, $rangeLabel] = match ($period) {
    'day' => [
        $anchor->setTime(0, 0, 0),
        $anchor->modify('+1 day')->setTime(0, 0, 0),
        $anchor->format('M j, Y'),
    ],
    'week' => (static function (DateTimeImmutable $d): array {
        $monday = $d->modify('monday this week')->setTime(0, 0, 0);
        // PHP "monday this week" can jump forward on Sunday in some locales — normalize.
        if ((int) $d->format('N') === 7) {
            $monday = $d->modify('monday last week')->setTime(0, 0, 0);
        }
        $next = $monday->modify('+7 days');
        return [
            $monday,
            $next,
            $monday->format('M j, Y') . ' – ' . $monday->modify('+6 days')->format('M j, Y'),
        ];
    })($anchor),
    default => [
        $anchor->modify('first day of this month')->setTime(0, 0, 0),
        $anchor->modify('first day of next month')->setTime(0, 0, 0),
        $anchor->format('F Y'),
    ],
};

$pdo = witnessworld_pdo();
$previewCount = 0;
try {
    $st = $pdo->prepare(
        'SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?'
    );
    $st->execute([$from->format('Y-m-d H:i:s'), $toExclusive->format('Y-m-d H:i:s')]);
    $previewCount = (int) $st->fetchColumn();
} catch (Throwable) {
    $previewCount = 0;
}

$downloadQs = http_build_query([
    'period' => $period,
    'date' => $anchor->format('Y-m-d'),
]);

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="mx-auto max-w-3xl space-y-6">
  <div>
    <p class="text-sm text-slate-500"><a href="index.php" class="font-semibold text-brand hover:underline">← Dashboard</a></p>
    <h1 class="mt-1 text-xl font-bold text-slate-900">Export member data</h1>
    <p class="mt-2 text-sm text-slate-600">Download an Excel-compatible spreadsheet of members who joined in the selected period, including verification poll answers and active listing counts.</p>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <form method="get" class="space-y-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Period</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <?php
          $chips = ['day' => 'Day', 'week' => 'Week', 'month' => 'Month'];
          foreach ($chips as $key => $label):
              $active = $period === $key;
              ?>
            <label class="cursor-pointer">
              <input type="radio" name="period" value="<?= htmlspecialchars($key, ENT_QUOTES, 'UTF-8') ?>" class="peer sr-only" <?= $active ? 'checked' : '' ?> onchange="this.form.submit()" />
              <span class="inline-flex rounded-xl border px-4 py-2 text-sm font-semibold peer-checked:border-brand peer-checked:bg-brand/10 peer-checked:text-brand-dark <?= $active ? 'border-brand bg-brand/10 text-brand-dark' : 'border-slate-200 text-slate-700 hover:bg-slate-50' ?>">
                <?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?>
              </span>
            </label>
          <?php endforeach; ?>
        </div>
      </div>

      <div>
        <label class="block text-xs font-semibold text-slate-600" for="export-date">Reference date</label>
        <input
          type="date"
          id="export-date"
          name="date"
          value="<?= htmlspecialchars($anchor->format('Y-m-d'), ENT_QUOTES, 'UTF-8') ?>"
          class="mt-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          onchange="this.form.submit()"
        />
        <p class="mt-1 text-xs text-slate-500">
          <?php if ($period === 'day'): ?>
            Exports members who joined on this day.
          <?php elseif ($period === 'week'): ?>
            Exports members who joined during the week of this date (Mon–Sun).
          <?php else: ?>
            Exports members who joined during the calendar month of this date.
          <?php endif; ?>
        </p>
      </div>

      <div class="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span class="font-semibold text-slate-900"><?= (int) $previewCount ?></span>
        member<?= $previewCount === 1 ? '' : 's' ?>
        for <span class="font-semibold"><?= htmlspecialchars($rangeLabel, ENT_QUOTES, 'UTF-8') ?></span>
      </div>

      <div class="flex flex-wrap gap-2">
        <button type="submit" class="admin-btn admin-btn--soft">Update preview</button>
        <a href="export_data_download.php?<?= htmlspecialchars($downloadQs, ENT_QUOTES, 'UTF-8') ?>" class="admin-btn admin-btn--primary">
          Download Excel file
        </a>
      </div>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h2 class="text-sm font-semibold text-slate-900">Columns included</h2>
    <ul class="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
      <li>User full name</li>
      <li>User email</li>
      <li>Joined date</li>
      <li>Verification poll — Individual or Business</li>
      <li>Verification poll — Account manager support</li>
      <li>Verification poll — Primary purpose</li>
      <li>Verification poll — How they heard about WWC</li>
      <li>Active listings count (approved)</li>
      <li>Active listing titles</li>
    </ul>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

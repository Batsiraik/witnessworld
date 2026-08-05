<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/../api/lib/analytics.php';

$pageTitle = 'Analytics & impressions';
$activeNav = 'analytics';

$pdo = witnessworld_pdo();

$period = strtolower(trim((string) ($_GET['period'] ?? '30d')));
if (!in_array($period, ['7d', '30d', 'all'], true)) {
    $period = '30d';
}
$tab = strtolower(trim((string) ($_GET['tab'] ?? 'modules')));
if (!in_array($tab, ['modules', 'listings', 'products', 'stores', 'directory', 'profiles'], true)) {
    $tab = 'modules';
}

$sinceSql = '';
$sinceParams = [];
if ($period === '7d') {
    $sinceSql = ' AND view_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)';
} elseif ($period === '30d') {
    $sinceSql = ' AND view_date >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)';
}

$moduleLabels = [
    'services' => 'Services',
    'classifieds' => 'Classifieds',
    'community' => 'Community',
    'products' => 'Products',
    'stores' => 'Stores',
    'directory' => 'Directory',
    'discover' => 'Discover',
    'home' => 'Home',
];

$tablesReady = true;
try {
    $pdo->query('SELECT 1 FROM content_views LIMIT 1');
    $pdo->query('SELECT 1 FROM module_views LIMIT 1');
} catch (Throwable) {
    $tablesReady = false;
}

$moduleRows = [];
$leaderRows = [];
$totals = [
    'module_opens' => 0,
    'content_views' => 0,
    'profile_views' => 0,
];

if ($tablesReady) {
    try {
        $sql = 'SELECT COUNT(*) FROM module_views WHERE 1=1' . $sinceSql;
        $st = $pdo->query($sql);
        $totals['module_opens'] = (int) $st->fetchColumn();

        $sql = 'SELECT COUNT(*) FROM content_views WHERE subject_type <> \'member\'' . $sinceSql;
        $st = $pdo->query($sql);
        $totals['content_views'] = (int) $st->fetchColumn();

        $sql = 'SELECT COUNT(*) FROM content_views WHERE subject_type = \'member\'' . $sinceSql;
        $st = $pdo->query($sql);
        $totals['profile_views'] = (int) $st->fetchColumn();

        $sql = 'SELECT module_key, COUNT(*) AS views
                FROM module_views
                WHERE 1=1' . $sinceSql . '
                GROUP BY module_key
                ORDER BY views DESC, module_key ASC';
        $moduleRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

        if ($tab === 'listings') {
            $sql = 'SELECT cv.subject_id AS id, COUNT(*) AS views,
                           l.title, l.listing_type, l.moderation_status,
                           u.username, u.first_name, u.last_name
                    FROM content_views cv
                    INNER JOIN listings l ON l.id = cv.subject_id
                    INNER JOIN users u ON u.id = l.user_id
                    WHERE cv.subject_type = \'listing\'' . $sinceSql . '
                    GROUP BY cv.subject_id, l.title, l.listing_type, l.moderation_status, u.username, u.first_name, u.last_name
                    ORDER BY views DESC, cv.subject_id DESC
                    LIMIT 100';
            $leaderRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($tab === 'products') {
            $sql = 'SELECT cv.subject_id AS id, COUNT(*) AS views,
                           p.name AS title, s.name AS store_name,
                           u.username, u.first_name, u.last_name
                    FROM content_views cv
                    INNER JOIN store_products p ON p.id = cv.subject_id
                    INNER JOIN stores s ON s.id = p.store_id
                    INNER JOIN users u ON u.id = s.user_id
                    WHERE cv.subject_type = \'product\'' . $sinceSql . '
                    GROUP BY cv.subject_id, p.name, s.name, u.username, u.first_name, u.last_name
                    ORDER BY views DESC, cv.subject_id DESC
                    LIMIT 100';
            $leaderRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($tab === 'stores') {
            $sql = 'SELECT cv.subject_id AS id, COUNT(*) AS views,
                           s.name AS title, s.moderation_status,
                           u.username, u.first_name, u.last_name
                    FROM content_views cv
                    INNER JOIN stores s ON s.id = cv.subject_id
                    INNER JOIN users u ON u.id = s.user_id
                    WHERE cv.subject_type = \'store\'' . $sinceSql . '
                    GROUP BY cv.subject_id, s.name, s.moderation_status, u.username, u.first_name, u.last_name
                    ORDER BY views DESC, cv.subject_id DESC
                    LIMIT 100';
            $leaderRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($tab === 'directory') {
            $sql = 'SELECT cv.subject_id AS id, COUNT(*) AS views,
                           d.business_name AS title, d.city, d.moderation_status,
                           u.username, u.first_name, u.last_name
                    FROM content_views cv
                    INNER JOIN directory_entries d ON d.id = cv.subject_id
                    INNER JOIN users u ON u.id = d.user_id
                    WHERE cv.subject_type = \'directory_entry\'' . $sinceSql . '
                    GROUP BY cv.subject_id, d.business_name, d.city, d.moderation_status, u.username, u.first_name, u.last_name
                    ORDER BY views DESC, cv.subject_id DESC
                    LIMIT 100';
            $leaderRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        } elseif ($tab === 'profiles') {
            $sql = 'SELECT cv.subject_id AS id, COUNT(*) AS views,
                           u.username, u.first_name, u.last_name, u.email
                    FROM content_views cv
                    INNER JOIN users u ON u.id = cv.subject_id
                    WHERE cv.subject_type = \'member\'' . $sinceSql . '
                    GROUP BY cv.subject_id, u.username, u.first_name, u.last_name, u.email
                    ORDER BY views DESC, cv.subject_id DESC
                    LIMIT 100';
            $leaderRows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Throwable $e) {
        $tablesReady = false;
    }
}

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'analytics.php' : $base . '/analytics.php';

$periodLabel = $period === '7d' ? 'Last 7 days' : ($period === '30d' ? 'Last 30 days' : 'All time');

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if (!$tablesReady): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    Analytics tables are not installed yet. Run
    <code class="rounded bg-amber-100 px-1">database/revisions_analytics.sql</code>
    against your MySQL database, then refresh this page.
  </div>
<?php endif; ?>

<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
  <div>
    <h2 class="text-base font-semibold text-slate-900">Analytics &amp; impressions</h2>
    <p class="mt-1 text-sm text-slate-500">Unique views: one count per viewer per item (or module) per calendar day. Owners viewing their own content are excluded.</p>
  </div>
  <div class="flex flex-wrap gap-2">
    <?php foreach (['7d' => '7 days', '30d' => '30 days', 'all' => 'All time'] as $pkey => $plabel): ?>
      <a href="<?= htmlspecialchars($self . '?tab=' . urlencode($tab) . '&period=' . urlencode($pkey), ENT_QUOTES, 'UTF-8') ?>"
         class="rounded-lg px-3 py-1.5 text-sm font-semibold <?= $period === $pkey ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200' ?>">
        <?= htmlspecialchars($plabel, ENT_QUOTES, 'UTF-8') ?>
      </a>
    <?php endforeach; ?>
  </div>
</div>

<div class="mb-6 grid gap-4 sm:grid-cols-3">
  <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Module opens</p>
    <p class="mt-2 text-2xl font-bold text-slate-900"><?= number_format($totals['module_opens']) ?></p>
    <p class="mt-1 text-xs text-slate-500"><?= htmlspecialchars($periodLabel, ENT_QUOTES, 'UTF-8') ?></p>
  </div>
  <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Listing &amp; store views</p>
    <p class="mt-2 text-2xl font-bold text-slate-900"><?= number_format($totals['content_views']) ?></p>
    <p class="mt-1 text-xs text-slate-500">Listings, products, stores, directory</p>
  </div>
  <div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
    <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">Profile visits</p>
    <p class="mt-2 text-2xl font-bold text-slate-900"><?= number_format($totals['profile_views']) ?></p>
    <p class="mt-1 text-xs text-slate-500">Public member profiles</p>
  </div>
</div>

<div class="mb-4 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
  <?php
  $tabs = [
      'modules' => 'Modules',
      'listings' => 'Listings',
      'products' => 'Products',
      'stores' => 'Stores',
      'directory' => 'Directory',
      'profiles' => 'Profiles',
  ];
  foreach ($tabs as $tkey => $tlabel):
  ?>
    <a href="<?= htmlspecialchars($self . '?tab=' . urlencode($tkey) . '&period=' . urlencode($period), ENT_QUOTES, 'UTF-8') ?>"
       class="rounded-lg px-3 py-1.5 text-sm font-semibold <?= $tab === $tkey ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100' ?>">
      <?= htmlspecialchars($tlabel, ENT_QUOTES, 'UTF-8') ?>
    </a>
  <?php endforeach; ?>
</div>

<?php if ($tab === 'modules'): ?>
<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4">
    <h3 class="text-sm font-semibold text-slate-900">Module opens</h3>
    <p class="text-xs text-slate-500 mt-1">How many unique members/devices opened each browse module (<?= htmlspecialchars($periodLabel, ENT_QUOTES, 'UTF-8') ?>).</p>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">Module</th>
          <th class="px-6 py-3 text-right">Unique opens</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if ($moduleRows === []): ?>
          <tr><td colspan="2" class="px-6 py-8 text-center text-slate-500">No module opens recorded yet.</td></tr>
        <?php else: ?>
          <?php foreach ($moduleRows as $r): ?>
            <tr class="hover:bg-brand-muted/20">
              <td class="px-6 py-4 font-medium text-slate-900">
                <?= htmlspecialchars($moduleLabels[(string) $r['module_key']] ?? (string) $r['module_key'], ENT_QUOTES, 'UTF-8') ?>
                <div class="text-xs font-normal text-slate-500"><?= htmlspecialchars((string) $r['module_key'], ENT_QUOTES, 'UTF-8') ?></div>
              </td>
              <td class="px-6 py-4 text-right font-semibold text-slate-900"><?= number_format((int) $r['views']) ?></td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
<?php else: ?>
<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4">
    <h3 class="text-sm font-semibold text-slate-900">Top <?= htmlspecialchars($tabs[$tab] ?? $tab, ENT_QUOTES, 'UTF-8') ?> by views</h3>
    <p class="text-xs text-slate-500 mt-1"><?= htmlspecialchars($periodLabel, ENT_QUOTES, 'UTF-8') ?> · unique viewers</p>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">#</th>
          <th class="px-6 py-3"><?= $tab === 'profiles' ? 'Member' : 'Item' ?></th>
          <th class="px-6 py-3">Owner</th>
          <th class="px-6 py-3 text-right">Views</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php if ($leaderRows === []): ?>
          <tr><td colspan="4" class="px-6 py-8 text-center text-slate-500">No views recorded for this period yet.</td></tr>
        <?php else: ?>
          <?php foreach ($leaderRows as $i => $r): ?>
            <?php
              $ownerName = trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? ''));
              $title = (string) ($r['title'] ?? '');
              if ($tab === 'profiles') {
                  $title = $ownerName !== '' ? $ownerName : ('@' . (string) ($r['username'] ?? ''));
              }
              $reviewHref = '';
              if ($tab === 'listings') {
                  $reviewHref = 'listing.php?id=' . (int) $r['id'];
              } elseif ($tab === 'profiles') {
                  $reviewHref = 'user.php?id=' . (int) $r['id'];
              }
            ?>
            <tr class="hover:bg-brand-muted/20">
              <td class="px-6 py-4 text-slate-500"><?= (int) $i + 1 ?></td>
              <td class="px-6 py-4 font-medium text-slate-900">
                <?php if ($reviewHref !== ''): ?>
                  <a href="<?= htmlspecialchars($reviewHref, ENT_QUOTES, 'UTF-8') ?>" class="hover:text-brand"><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></a>
                <?php else: ?>
                  <?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?>
                <?php endif; ?>
                <div class="text-xs font-normal text-slate-500">
                  #<?= (int) $r['id'] ?>
                  <?php if (!empty($r['listing_type'])): ?> · <?= htmlspecialchars((string) $r['listing_type'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?>
                  <?php if (!empty($r['store_name'])): ?> · <?= htmlspecialchars((string) $r['store_name'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?>
                  <?php if (!empty($r['city'])): ?> · <?= htmlspecialchars((string) $r['city'], ENT_QUOTES, 'UTF-8') ?><?php endif; ?>
                </div>
              </td>
              <td class="px-6 py-4 text-slate-600">
                <?php if ($tab === 'profiles'): ?>
                  <?= htmlspecialchars((string) ($r['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?>
                <?php else: ?>
                  <?= htmlspecialchars($ownerName, ENT_QUOTES, 'UTF-8') ?>
                  <div class="text-xs text-slate-500">@<?= htmlspecialchars((string) ($r['username'] ?? ''), ENT_QUOTES, 'UTF-8') ?></div>
                <?php endif; ?>
              </td>
              <td class="px-6 py-4 text-right font-semibold text-slate-900"><?= number_format((int) $r['views']) ?></td>
            </tr>
          <?php endforeach; ?>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>
<?php endif; ?>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

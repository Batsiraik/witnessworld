<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'Businesses';
$activeNav = 'businesses';

$pdo = witnessworld_pdo();

$sql = "SELECT id, email, username, first_name, last_name, phone, status, registration_account_type,
        registration_country_name, congregation, created_at
        FROM users
        WHERE registration_account_type = 'business'
        ORDER BY id DESC";
$rows = $pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$userHref = static function (int $id) use ($base): string {
    $p = ($base === '' || $base === '.') ? 'user.php' : $base . '/user.php';

    return $p . '?id=' . $id;
};

function ww_business_status_badge(string $s): string
{
    $map = [
        'pending_otp' => 'bg-slate-100 text-slate-700 ring-slate-600/10',
        'pending_verification' => 'bg-amber-50 text-amber-900 ring-amber-600/20',
        'verified' => 'bg-emerald-50 text-emerald-800 ring-emerald-600/20',
        'declined' => 'bg-red-50 text-red-800 ring-red-600/20',
    ];
    $c = $map[$s] ?? 'bg-slate-100 text-slate-700';

    return '<span class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ' . $c . '">' . htmlspecialchars($s, ENT_QUOTES, 'UTF-8') . '</span>';
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
  <div class="border-b border-slate-100 px-6 py-4">
    <h2 class="text-base font-semibold text-slate-900">Business signups</h2>
    <p class="mt-1 text-sm text-slate-500">
      Members who chose <strong>Business</strong> on the verification poll — use this list for future marketing campaigns.
    </p>
    <p class="mt-2 text-xs text-slate-500"><?= count($rows) ?> user(s)</p>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">User</th>
          <th class="px-6 py-3">Email</th>
          <th class="px-6 py-3">Country</th>
          <th class="px-6 py-3">Congregation</th>
          <th class="px-6 py-3">Status</th>
          <th class="px-6 py-3">Joined</th>
          <th class="px-6 py-3 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <?php foreach ($rows as $r): ?>
          <tr class="bg-white hover:bg-brand-muted/20">
            <td class="px-6 py-4 font-medium text-slate-900">
              <?= htmlspecialchars((string) $r['first_name'] . ' ' . (string) $r['last_name'], ENT_QUOTES, 'UTF-8') ?>
              <div class="text-xs font-normal text-slate-500">@<?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></div>
            </td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) $r['email'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) ($r['registration_country_name'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-slate-600"><?= htmlspecialchars((string) ($r['congregation'] ?? '—'), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4"><?= ww_business_status_badge((string) $r['status']) ?></td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-right">
              <a href="<?= htmlspecialchars($userHref((int) $r['id']), ENT_QUOTES, 'UTF-8') ?>" class="text-sm font-semibold text-brand hover:text-brand-dark">View</a>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="7" class="px-6 py-8 text-center text-slate-500">No business signups yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

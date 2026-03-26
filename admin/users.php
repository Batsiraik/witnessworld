<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

$pageTitle = 'App users';
$activeNav = 'users';

$pdo = witnessworld_pdo();

$filter = (string) ($_GET['status'] ?? 'all');
$allowed = [
    'all',
    'pending_otp',
    'pending_questions',
    'pending_verification',
    'verified',
    'declined',
];
if (!in_array($filter, $allowed, true)) {
    $filter = 'all';
}

$sql = 'SELECT id, email, username, first_name, last_name, phone, status, created_at FROM users';
$params = [];
if ($filter !== 'all') {
    $sql .= ' WHERE status = ?';
    $params[] = $filter;
}
$sql .= ' ORDER BY id DESC';
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$usersSelf = ($base === '' || $base === '.') ? 'users.php' : $base . '/users.php';
$userChip = static function (string $key, string $label, string $cur) use ($usersSelf): string {
    $qs = $key === 'all' ? '' : ('?status=' . urlencode($key));
    $active = $cur === $key;
    $cls = $active
        ? 'border-brand bg-brand/10 text-brand-dark ring-1 ring-brand/30'
        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300';

    return '<a href="' . htmlspecialchars($usersSelf . $qs, ENT_QUOTES, 'UTF-8') . '" class="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ' . $cls . '">' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</a>';
};

function ww_status_badge(string $s): string
{
    $map = [
        'pending_otp' => 'bg-slate-100 text-slate-700 ring-slate-600/10',
        'pending_questions' => 'bg-blue-50 text-blue-800 ring-blue-600/15',
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
  <div class="border-b border-slate-100 px-6 py-4 space-y-4">
    <div>
      <h2 class="text-base font-semibold text-slate-900">App users</h2>
      <p class="text-sm text-slate-500">Open a user to review questionnaire answers and approve or decline.</p>
    </div>
    <div class="flex flex-wrap gap-2">
      <?= $userChip('all', 'All', $filter) ?>
      <?= $userChip('pending_verification', 'Pending verification', $filter) ?>
      <?= $userChip('pending_questions', 'Pending questions', $filter) ?>
      <?= $userChip('verified', 'Verified', $filter) ?>
      <?= $userChip('declined', 'Declined', $filter) ?>
      <?= $userChip('pending_otp', 'Pending OTP', $filter) ?>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b border-slate-100 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-6 py-3">User</th>
          <th class="px-6 py-3">Email</th>
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
            <td class="px-6 py-4"><?= ww_status_badge((string) $r['status']) ?></td>
            <td class="px-6 py-4 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-6 py-4 text-right">
              <button type="button" class="text-sm font-semibold text-brand hover:text-brand-dark js-user-modal-open" data-user-id="<?= (int) $r['id'] ?>">View</button>
            </td>
          </tr>
        <?php endforeach; ?>
        <?php if ($rows === []): ?>
          <tr><td colspan="5" class="px-6 py-8 text-center text-slate-500">No users yet.</td></tr>
        <?php endif; ?>
      </tbody>
    </table>
  </div>
</div>

<div id="user-review-modal" class="fixed inset-0 z-50 hidden" role="dialog" aria-modal="true" aria-labelledby="user-review-modal-title">
  <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] js-user-modal-backdrop" aria-hidden="true"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-2xl max-h-[min(90vh,800px)] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
      <div class="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 id="user-review-modal-title" class="text-base font-semibold text-slate-900">User details</h2>
        <button type="button" class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 js-user-modal-close" aria-label="Close">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div id="user-review-modal-body" class="min-h-0 flex-1 overflow-y-auto px-5 py-4 text-left">
        <div class="flex items-center justify-center py-12 text-sm text-slate-500">Loading…</div>
      </div>
    </div>
  </div>
</div>

<script>
(function () {
  var modal = document.getElementById('user-review-modal');
  var bodyEl = document.getElementById('user-review-modal-body');
  if (!modal || !bodyEl) return;

  function openModal() {
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  }
  function closeModal() {
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
    bodyEl.innerHTML = '<div class="flex items-center justify-center py-12 text-sm text-slate-500">Loading…</div>';
  }

  modal.querySelectorAll('.js-user-modal-close, .js-user-modal-backdrop').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  document.querySelectorAll('.js-user-modal-open').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-user-id');
      if (!id) return;
      openModal();
      bodyEl.innerHTML = '<div class="flex items-center justify-center py-12 text-sm text-slate-500">Loading…</div>';
      fetch('user_modal.php?id=' + encodeURIComponent(id), { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.text(); })
        .then(function (html) { bodyEl.innerHTML = html; })
        .catch(function () {
          bodyEl.innerHTML = '<p class="text-sm text-red-600">Could not load user. Try again or open the full page from the list.</p>';
        });
    });
  });
})();
</script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

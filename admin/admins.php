<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

if (!$currentAdmin['is_super']) {
    http_response_code(403);
    echo 'Forbidden';
    exit;
}

$pageTitle = 'Admins';
$activeNav = 'admins';

$pdo = witnessworld_pdo();
$error = '';
$flash = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $name = trim((string) ($_POST['name'] ?? ''));
    $email = trim((string) ($_POST['email'] ?? ''));
    $username = trim((string) ($_POST['username'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    if ($name === '' || $email === '' || $username === '' || strlen($pass) < 6) {
        $error = 'Name, email, username, and password (6+ chars) are required.';
    } else {
        $hash = password_hash($pass, PASSWORD_DEFAULT);
        try {
            $st = $pdo->prepare(
                'INSERT INTO admins (username, password_hash, name, email, is_super_admin) VALUES (?,?,?,?,0)'
            );
            $st->execute([$username, $hash, $name, $email]);
            $flash = 'Admin created.';
        } catch (Throwable $e) {
            $error = 'Could not create admin (username or email may already exist).';
        }
    }
}

$rows = $pdo->query('SELECT id, username, name, email, is_super_admin, created_at FROM admins ORDER BY id ASC')->fetchAll(PDO::FETCH_ASSOC);

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>
<?php if ($error !== ''): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="grid gap-6 lg:grid-cols-2">
  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h2 class="text-base font-semibold text-slate-900">Add admin</h2>
    <form method="post" class="mt-4 space-y-3">
      <div>
        <label class="text-xs font-semibold text-slate-600">Name</label>
        <input name="name" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Email</label>
        <input type="email" name="email" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Username</label>
        <input name="username" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" autocomplete="off" required />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Password</label>
        <input type="password" name="password" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Create</button>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel lg:col-span-2">
    <h2 class="text-base font-semibold text-slate-900">All admins</h2>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b text-xs font-semibold uppercase text-slate-500">
          <tr><th class="py-2">Username</th><th class="py-2">Name</th><th class="py-2">Email</th><th class="py-2">Role</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($rows as $r): ?>
            <tr>
              <td class="py-3 font-medium"><?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= htmlspecialchars((string) $r['email'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= ((int) $r['is_super_admin']) ? 'Super admin' : 'Admin' ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

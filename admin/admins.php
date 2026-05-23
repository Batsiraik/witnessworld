<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_security.php';

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
$createdCredentials = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $name = trim((string) ($_POST['name'] ?? ''));
    $email = strtolower(trim((string) ($_POST['email'] ?? '')));
    if ($name === '' || $email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $error = 'Enter a valid name and email address.';
    } else {
        $dup = $pdo->prepare('SELECT id FROM admins WHERE LOWER(email) = ? LIMIT 1');
        $dup->execute([$email]);
        if ($dup->fetch()) {
            $error = 'An admin with this email already exists.';
        } else {
        $username = ww_admin_unique_username($pdo, $email);
        $plainPassword = ww_admin_generate_password();
        $hash = password_hash($plainPassword, PASSWORD_DEFAULT);
        try {
            $st = $pdo->prepare(
                'INSERT INTO admins (username, password_hash, name, email, is_super_admin) VALUES (?,?,?,?,0)'
            );
            $st->execute([$username, $hash, $name, $email]);
            $adminRow = [
                'name' => $name,
                'email' => $email,
            ];
            try {
                $sent = ww_admin_send_welcome_email($pdo, $adminRow, $username, $plainPassword);
            } catch (Throwable) {
                $sent = false;
            }
            if ($sent) {
                $flash = 'Admin created. Login details were emailed to ' . $email . '.';
            } else {
                $flash = 'Admin created, but the welcome email could not be sent (check SMTP in Settings). Share the credentials below securely.';
                $createdCredentials = [
                    'name' => $name,
                    'email' => $email,
                    'username' => $username,
                    'password' => $plainPassword,
                    'login_url' => ww_admin_public_login_url(),
                ];
            }
        } catch (Throwable $e) {
            $error = 'Could not create admin (email may already be in use).';
        }
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

<?php if ($createdCredentials !== null): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
    <p class="font-semibold">Share these login details securely:</p>
    <ul class="mt-2 space-y-1 font-mono text-xs">
      <li><span class="font-sans font-semibold">Name:</span> <?= htmlspecialchars($createdCredentials['name'], ENT_QUOTES, 'UTF-8') ?></li>
      <li><span class="font-sans font-semibold">Email:</span> <?= htmlspecialchars($createdCredentials['email'], ENT_QUOTES, 'UTF-8') ?></li>
      <li><span class="font-sans font-semibold">Username:</span> <?= htmlspecialchars($createdCredentials['username'], ENT_QUOTES, 'UTF-8') ?></li>
      <li><span class="font-sans font-semibold">Password:</span> <?= htmlspecialchars($createdCredentials['password'], ENT_QUOTES, 'UTF-8') ?></li>
      <li><span class="font-sans font-semibold">Sign in:</span> <a class="text-brand underline" href="<?= htmlspecialchars($createdCredentials['login_url'], ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($createdCredentials['login_url'], ENT_QUOTES, 'UTF-8') ?></a></li>
    </ul>
  </div>
<?php endif; ?>

<div class="grid gap-6 lg:grid-cols-2">
  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <h2 class="text-base font-semibold text-slate-900">Add admin</h2>
    <p class="mt-1 text-xs text-slate-500">We generate a username and strong password, then email login details using your branded template.</p>
    <form method="post" class="mt-4 space-y-3">
      <div>
        <label class="text-xs font-semibold text-slate-600">Full name</label>
        <input name="name" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Email</label>
        <input type="email" name="email" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">Add Administrator</button>
    </form>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white p-6 shadow-panel lg:col-span-2">
    <h2 class="text-base font-semibold text-slate-900">All admins</h2>
    <p class="mt-1 text-xs text-slate-500">New browsers and sign-ins after 7 days of inactivity require a one-time email code.</p>
    <div class="mt-4 overflow-x-auto">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b text-xs font-semibold uppercase text-slate-500">
          <tr><th class="py-2">Username</th><th class="py-2">Name</th><th class="py-2">Email</th><th class="py-2">Role</th><th class="py-2">Added</th></tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($rows as $r): ?>
            <tr>
              <td class="py-3 font-medium"><?= htmlspecialchars((string) $r['username'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= htmlspecialchars((string) $r['name'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= htmlspecialchars((string) $r['email'], ENT_QUOTES, 'UTF-8') ?></td>
              <td class="py-3"><?= ((int) $r['is_super_admin']) ? 'Super admin' : 'Admin' ?></td>
              <td class="py-3 text-slate-500"><?= htmlspecialchars((string) $r['created_at'], ENT_QUOTES, 'UTF-8') ?></td>
            </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
    </div>
  </div>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

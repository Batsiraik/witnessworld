<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/admin_auth.php';
require_once __DIR__ . '/includes/admin_security.php';

if (!empty($_SESSION['admin_id'])) {
    header('Location: index.php');
    exit;
}
if (ww_admin_otp_pending_id() > 0) {
    header('Location: verify-otp.php');
    exit;
}
if (ww_admin_reset_allowed_id() > 0) {
    header('Location: reset-password.php');
    exit;
}
if (ww_admin_reset_pending_id() > 0) {
    header('Location: reset-verify-otp.php');
    exit;
}

$error = '';
$info = isset($_GET['reset']) && $_GET['reset'] === '1'
    ? 'Password updated. Sign in with your new password.'
    : '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $user = trim((string) ($_POST['username'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    if ($user === '' || $pass === '') {
        $error = 'Enter username and password.';
    } else {
        try {
            $pdo = witnessworld_pdo();
            $st = $pdo->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
            $st->execute([$user]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if ($row && password_verify($pass, (string) $row['password_hash'])) {
                $result = ww_admin_complete_password_login($pdo, $row);
                if ($result === 'session') {
                    header('Location: index.php');
                    exit;
                }
                header('Location: verify-otp.php');
                exit;
            }
            $error = 'Invalid username or password.';
        } catch (Throwable) {
            $error = 'Database error. Ensure admin OTP tables exist (run database/revisions.sql). Check config.local.php.';
        }
    }
}
$pageTitle = 'Admin sign in';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><?= htmlspecialchars($pageTitle, ENT_QUOTES, 'UTF-8') ?></title>
  <?php
    $adminFavBase = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
    if ($adminFavBase === '' || $adminFavBase === '.') {
        $adminFavBase = '';
    }
    $faviconHref = ($adminFavBase !== '' ? $adminFavBase : '') . '/favicon.png';
    ?>
  <link rel="icon" href="<?= htmlspecialchars($faviconHref, ENT_QUOTES, 'UTF-8') ?>" type="image/png" sizes="any" />
  <link rel="apple-touch-icon" href="<?= htmlspecialchars($faviconHref, ENT_QUOTES, 'UTF-8') ?>" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: { brand: { DEFAULT: '#1FAAF2', dark: '#1590d4' } } } } };
  </script>
</head>
<body class="min-h-screen bg-slate-100 flex items-center justify-center p-6">
  <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
    <h1 class="text-xl font-bold text-slate-900">Witness World Admin</h1>
    <p class="mt-1 text-sm text-slate-500">Sign in to manage users and settings.</p>
    <?php if ($error !== ''): ?>
      <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if ($info !== ''): ?>
      <p class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><?= htmlspecialchars($info, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-600">Username</label>
        <input name="username" autocomplete="username" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600">Password</label>
        <input type="password" name="password" autocomplete="current-password" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <button type="submit" class="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Sign in</button>
    </form>
    <p class="mt-3 text-center">
      <a href="forgot-password.php" class="text-sm font-semibold text-brand hover:underline">Forgot password?</a>
    </p>
    <p class="mt-4 text-xs text-slate-500 leading-relaxed">New browser or after 7 days without a visit, we email you a one-time code to finish signing in.</p>
  </div>
</body>
</html>

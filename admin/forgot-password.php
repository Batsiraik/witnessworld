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
$info = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $identifier = trim((string) ($_POST['identifier'] ?? ''));
    if ($identifier === '') {
        $error = 'Enter your admin email or username.';
    } else {
        try {
            $pdo = witnessworld_pdo();
            $result = ww_admin_start_password_reset($pdo, $identifier);
            // Always the same message (avoid account enumeration).
            $info = 'If that account exists, we sent a reset code to the email on file. Check spam if it does not arrive within a few minutes.';
            if (!empty($result['admin'])) {
                header('Location: reset-verify-otp.php');
                exit;
            }
        } catch (Throwable $e) {
            $msg = $e->getMessage();
            if (str_contains($msg, 'Unknown column') || str_contains($msg, 'password_reset_otp')) {
                $error = 'Password reset is not set up yet. Run the admins password_reset columns migration (database/revisions.sql), then try again.';
            } else {
                $error = 'Could not start password reset. Check SMTP settings or try again later.';
            }
        }
    }
}

$pageTitle = 'Forgot admin password';
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
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = { theme: { extend: { colors: { brand: { DEFAULT: '#1FAAF2', dark: '#1590d4' } } } } };
  </script>
</head>
<body class="min-h-screen bg-slate-100 flex items-center justify-center p-6">
  <div class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
    <h1 class="text-xl font-bold text-slate-900">Forgot password</h1>
    <p class="mt-1 text-sm text-slate-500">Enter your admin email or username. We&apos;ll send a one-time code to reset your password.</p>
    <?php if ($error !== ''): ?>
      <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if ($info !== ''): ?>
      <p class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><?= htmlspecialchars($info, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-600">Email or username</label>
        <input name="identifier" autocomplete="username" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <button type="submit" class="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Send reset code</button>
    </form>
    <p class="mt-4 text-center">
      <a href="login.php" class="text-xs font-semibold text-slate-500 hover:text-slate-700">← Back to sign in</a>
    </p>
  </div>
</body>
</html>

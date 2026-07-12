<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/admin_auth.php';
require_once __DIR__ . '/includes/admin_security.php';

if (!empty($_SESSION['admin_id'])) {
    header('Location: index.php');
    exit;
}

$allowedId = ww_admin_reset_allowed_id();
if ($allowedId <= 0) {
    if (ww_admin_reset_pending_id() > 0) {
        header('Location: reset-verify-otp.php');
        exit;
    }
    header('Location: forgot-password.php');
    exit;
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT id, username, name, email FROM admins WHERE id = ? LIMIT 1');
$st->execute([$allowedId]);
$adminRow = $st->fetch(PDO::FETCH_ASSOC);
if (!$adminRow) {
    ww_admin_clear_password_reset_session();
    header('Location: forgot-password.php');
    exit;
}

$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $pass = (string) ($_POST['password'] ?? '');
    $confirm = (string) ($_POST['password_confirm'] ?? '');
    if (strlen($pass) < 8) {
        $error = 'Password must be at least 8 characters.';
    } elseif ($pass !== $confirm) {
        $error = 'Passwords do not match.';
    } else {
        try {
            $hash = password_hash($pass, PASSWORD_DEFAULT);
            if ($hash === false) {
                throw new RuntimeException('password_hash failed');
            }
            $upd = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
            $upd->execute([$hash, $allowedId]);
            if ($upd->rowCount() < 1) {
                // Hash may be unchanged if identical; still verify row exists.
                $check = $pdo->prepare('SELECT id FROM admins WHERE id = ? LIMIT 1');
                $check->execute([$allowedId]);
                if (!$check->fetch()) {
                    throw new RuntimeException('Admin not found');
                }
            }
            ww_admin_clear_password_reset_otp($pdo, $allowedId);
            try {
                ww_admin_revoke_trusted_devices($pdo, $allowedId);
            } catch (Throwable) {
                // Password already saved — don't fail the reset for device cleanup.
            }
            ww_admin_clear_password_reset_session();
            header('Location: login.php?reset=1&u=' . rawurlencode((string) $adminRow['username']));
            exit;
        } catch (Throwable) {
            $error = 'Could not update password. Try again.';
        }
    }
}

$pageTitle = 'Set new admin password';
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
    <h1 class="text-xl font-bold text-slate-900">Choose a new password</h1>
    <p class="mt-1 text-sm text-slate-500">
      For <span class="font-semibold text-slate-700">@<?= htmlspecialchars((string) $adminRow['username'], ENT_QUOTES, 'UTF-8') ?></span>.
      After saving, sign in with your new password.
    </p>
    <?php if ($error !== ''): ?>
      <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-600">New password</label>
        <input type="password" name="password" autocomplete="new-password" minlength="8" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600">Confirm password</label>
        <input type="password" name="password_confirm" autocomplete="new-password" minlength="8" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" required />
      </div>
      <button type="submit" class="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Save new password</button>
    </form>
    <p class="mt-4 text-center">
      <a href="login.php" class="text-xs font-semibold text-slate-500 hover:text-slate-700">← Back to sign in</a>
    </p>
  </div>
</body>
</html>

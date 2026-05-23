<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/admin_auth.php';
require_once __DIR__ . '/includes/admin_security.php';

$pendingId = ww_admin_otp_pending_id();
if ($pendingId <= 0) {
    if (!empty($_SESSION['admin_id'])) {
        header('Location: index.php');
        exit;
    }
    header('Location: login.php');
    exit;
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT * FROM admins WHERE id = ? LIMIT 1');
$st->execute([$pendingId]);
$adminRow = $st->fetch(PDO::FETCH_ASSOC);
if (!$adminRow) {
    unset($_SESSION['admin_otp_pending_id']);
    header('Location: login.php');
    exit;
}

$error = '';
$info = '';
$maskedEmail = preg_replace('/(^.).*(@.*$)/', '$1***$2', (string) $adminRow['email']) ?: (string) $adminRow['email'];

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? 'verify');
    if ($action === 'resend') {
        $otp = ww_admin_issue_login_otp($pdo, $pendingId);
        $sent = ww_admin_send_login_otp_email($pdo, $adminRow, $otp);
        $info = $sent
            ? 'A new code was sent to your email.'
            : 'Could not send email — check SMTP settings. Contact your super admin.';
    } else {
        $code = preg_replace('/\D/', '', (string) ($_POST['otp'] ?? ''));
        if (strlen($code) !== 6) {
            $error = 'Enter the 6-digit code from your email.';
        } elseif (ww_admin_verify_login_otp($pdo, $pendingId, $code)) {
            ww_admin_complete_otp_login($pdo, $adminRow);
            header('Location: index.php');
            exit;
        } else {
            $error = 'Invalid or expired code. Try again or request a new code.';
        }
    }
}

$pageTitle = 'Verify sign-in';
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
    <h1 class="text-xl font-bold text-slate-900">Check your email</h1>
    <p class="mt-1 text-sm text-slate-500">We sent a 6-digit code to <span class="font-semibold text-slate-700"><?= htmlspecialchars($maskedEmail, ENT_QUOTES, 'UTF-8') ?></span>.</p>
    <?php if ($error !== ''): ?>
      <p class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <?php if ($info !== ''): ?>
      <p class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"><?= htmlspecialchars($info, ENT_QUOTES, 'UTF-8') ?></p>
    <?php endif; ?>
    <form method="post" class="mt-6 space-y-4">
      <input type="hidden" name="action" value="verify" />
      <div>
        <label class="block text-xs font-semibold text-slate-600">Sign-in code</label>
        <input
          name="otp"
          inputmode="numeric"
          pattern="[0-9]{6}"
          maxlength="6"
          autocomplete="one-time-code"
          class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-lg font-bold tracking-[0.35em]"
          required
        />
      </div>
      <button type="submit" class="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Continue</button>
    </form>
    <form method="post" class="mt-3">
      <input type="hidden" name="action" value="resend" />
      <button type="submit" class="w-full text-sm font-semibold text-brand hover:underline">Resend code</button>
    </form>
    <p class="mt-4 text-center">
      <a href="login.php" class="text-xs font-semibold text-slate-500 hover:text-slate-700">← Back to sign in</a>
    </p>
    <p class="mt-4 text-xs text-slate-500 leading-relaxed">On this browser, you won’t need a code again for 7 days while you use the admin panel regularly.</p>
  </div>
</body>
</html>

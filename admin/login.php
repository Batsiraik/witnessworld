<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/admin_auth.php';

if (!empty($_SESSION['admin_id'])) {
    header('Location: index.php');
    exit;
}

$error = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $user = trim((string) ($_POST['username'] ?? ''));
    $pass = (string) ($_POST['password'] ?? '');
    if ($user === '' || $pass === '') {
        $error = 'Enter username and password.';
    } else {
        $pdo = witnessworld_pdo();
        $st = $pdo->prepare('SELECT * FROM admins WHERE username = ? LIMIT 1');
        $st->execute([$user]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row && password_verify($pass, (string) $row['password_hash'])) {
            $_SESSION['admin_id'] = (int) $row['id'];
            $_SESSION['admin_username'] = (string) $row['username'];
            $_SESSION['admin_name'] = (string) $row['name'];
            $_SESSION['admin_email'] = (string) $row['email'];
            $_SESSION['admin_super'] = (bool) $row['is_super_admin'];
            header('Location: index.php');
            exit;
        }
        $error = 'Invalid username or password.';
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
  </div>
</body>
</html>

<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';
require_once __DIR__ . '/includes/push_triggers.php';

$id = (int) ($_GET['id'] ?? 0);
if ($id <= 0) {
    header('Location: users.php');
    exit;
}

$pdo = witnessworld_pdo();
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$userPhp = ($base === '' || $base === '.') ? 'user.php' : $base . '/user.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $returnTo = (string) ($_POST['return'] ?? '');
    $flashQs = '';

    if ($action === 'approve' || $action === 'decline') {
        $st = $pdo->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $cur = $st->fetchColumn();
        if ($cur === 'pending_verification') {
            if ($action === 'approve') {
                $pdo->prepare("UPDATE users SET status = 'verified' WHERE id = ?")->execute([$id]);
                ww_admin_notify_account_review($pdo, $id, 'approve');
            } elseif ($action === 'decline') {
                $pdo->prepare("UPDATE users SET status = 'declined' WHERE id = ?")->execute([$id]);
                ww_admin_notify_account_review($pdo, $id, 'decline');
            }
        }
    } elseif ($action === 'resend_otp') {
        require_once __DIR__ . '/../api/lib/registration_otp.php';
        $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
        $st->execute([$id]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if ($row && ($row['status'] ?? '') === 'pending_otp') {
            try {
                $result = ww_send_registration_otp($pdo, $row, false);
                if (!empty($result['ok'])) {
                    $flashQs = !empty($result['email_sent']) ? 'otp_resent=1' : 'otp_mail_failed=1';
                } else {
                    $flashQs = 'otp_error=' . rawurlencode((string) ($result['error'] ?? 'Could not resend OTP'));
                }
            } catch (Throwable $e) {
                $flashQs = 'otp_error=' . rawurlencode('Could not resend OTP. Check SMTP settings and try again.');
            }
        } else {
            $flashQs = 'otp_error=' . rawurlencode('This user is not waiting for email verification.');
        }
    } elseif ($action === 'verify_email') {
        require_once __DIR__ . '/../api/lib/registration_otp.php';
        if (ww_bypass_registration_otp($pdo, $id)) {
            $flashQs = 'otp_bypassed=1';
        } else {
            $flashQs = 'otp_error=' . rawurlencode('Could not bypass email verification.');
        }
    } elseif ($action === 'update_profile') {
        require_once __DIR__ . '/includes/profile_edit.php';
        $validated = ww_profile_validate_fields($_POST, true);
        if (!$validated['ok']) {
            $flashQs = 'profile_error=' . rawurlencode((string) ($validated['error'] ?? 'Invalid profile details'));
        } else {
            $st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
            $st->execute([$id]);
            $row = $st->fetch(PDO::FETCH_ASSOC);
            if (!$row) {
                $flashQs = 'profile_error=' . rawurlencode('User not found.');
            } else {
                $result = ww_profile_apply_update($pdo, $id, $row, $validated['data'], false);
                if (!$result['ok']) {
                    $flashQs = 'profile_error=' . rawurlencode((string) ($result['error'] ?? 'Could not update profile'));
                } else {
                    $flashQs = 'profile_updated=1';
                }
            }
        }
    } elseif ($action === 'suspend') {
        ww_admin_suspend_user($pdo, $id);
    } elseif ($action === 'delete') {
        if (ww_admin_delete_user($pdo, $id)) {
            $dest = $returnTo === 'businesses' ? 'businesses.php' : 'users.php';
            if ($base !== '' && $base !== '.') {
                $dest = $base . '/' . $dest;
            }
            header('Location: ' . $dest . '?deleted=1');
            exit;
        }
    }

    if ($returnTo === 'users') {
        $dest = 'users.php';
        if ($action === 'suspend') {
            $dest .= '?suspended=1';
        } elseif ($flashQs !== '') {
            $dest .= '?' . $flashQs;
        }
        header('Location: ' . $dest);
    } elseif ($returnTo === 'businesses') {
        $dest = 'businesses.php';
        if ($action === 'suspend') {
            $dest .= '?suspended=1';
        } elseif ($flashQs !== '') {
            $dest .= '?' . $flashQs;
        }
        header('Location: ' . $dest);
    } else {
        $dest = 'user.php?id=' . $id;
        if ($flashQs !== '') {
            $dest .= '&' . $flashQs;
        }
        header('Location: ' . $dest);
    }
    exit;
}

$st = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
$st->execute([$id]);
$user = $st->fetch(PDO::FETCH_ASSOC);
if (!$user) {
    header('Location: users.php');
    exit;
}

$support = ww_get_setting($pdo, 'support_email', 'support@witnessworldconnect.com');
$formReturn = '';
$showOpenFullPageLink = false;

$pageTitle = 'User #' . $id;
$activeNav = 'users';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <?php require __DIR__ . '/partials/user_otp_flash.php'; ?>
  <div class="flex flex-wrap items-center justify-between gap-3">
    <div>
      <p class="text-sm text-slate-500"><a href="users.php" class="font-semibold text-brand hover:underline">← Users</a></p>
      <h2 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars((string) $user['first_name'] . ' ' . (string) $user['last_name'], ENT_QUOTES, 'UTF-8') ?></h2>
      <p class="text-sm text-slate-600">@<?= htmlspecialchars((string) $user['username'], ENT_QUOTES, 'UTF-8') ?> · <?= htmlspecialchars((string) $user['email'], ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <div><?= ww_admin_status_badge((string) $user['status']) ?></div>
  </div>

  <?php require __DIR__ . '/partials/user_review_sections.php'; ?>
</div>

<?php
$confirmModalUserPhp = $userPhp;
require __DIR__ . '/partials/user_confirm_modal.php';
?>
<script src="<?= htmlspecialchars(($base === '' || $base === '.' ? '' : $base) . '/assets/admin-user-actions.js', ENT_QUOTES, 'UTF-8') ?>"></script>
<script>
(function () {
  var m = document.getElementById('admin-user-confirm-modal');
  if (m) m.setAttribute('data-user-php-base', <?= json_encode($userPhp, JSON_THROW_ON_ERROR) ?>);
})();
</script>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

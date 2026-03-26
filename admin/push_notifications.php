<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/../api/lib/push_notify.php';

$pageTitle = 'Push notifications';
$activeNav = 'push';
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$home = ($base === '' || $base === '.') ? 'index.php' : $base . '/index.php';
$pdo = witnessworld_pdo();
$flash = '';
$error = '';
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

if (!empty($_SESSION['push_notif_flash'])) {
    $flash = (string) $_SESSION['push_notif_flash'];
    unset($_SESSION['push_notif_flash']);
}

$tokenCount = 0;
$userCount = 0;
try {
    $tokenCount = (int) $pdo->query('SELECT COUNT(*) FROM user_push_tokens')->fetchColumn();
    $userCount = (int) $pdo->query(
        'SELECT COUNT(DISTINCT ut.user_id) FROM user_push_tokens ut INNER JOIN users u ON u.id = ut.user_id WHERE u.status = \'verified\''
    )->fetchColumn();
} catch (Throwable) {
    $error = 'user_push_tokens table missing. Run database/revisions_user_push_tokens.sql.';
}

if ($error === '' && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $postAction = (string) ($_POST['action'] ?? 'send');

    if ($postAction === 'refresh_receipts') {
        $logId = (int) ($_POST['log_id'] ?? 0);
        if ($logId <= 0) {
            $_SESSION['push_notif_flash'] = 'Invalid log.';
        } else {
            try {
                $st = $pdo->prepare(
                    'SELECT expo_ticket_id FROM admin_push_tickets WHERE log_id = ?'
                );
                $st->execute([$logId]);
                $ticketIds = [];
                while (($t = $st->fetchColumn()) !== false) {
                    $ticketIds[] = (string) $t;
                }
                if ($ticketIds === []) {
                    $_SESSION['push_notif_flash'] = 'No Expo ticket IDs stored for this send (nothing to check).';
                } else {
                    $rc = ww_expo_push_get_receipts($ticketIds);
                    $pdo->prepare(
                        'UPDATE admin_push_logs SET delivery_ok = ?, delivery_failed = ?, receipt_checked_at = CURRENT_TIMESTAMP WHERE id = ?'
                    )->execute([(int) $rc['ok'], (int) $rc['failed'], $logId]);
                    $_SESSION['push_notif_flash'] = 'Receipts updated: ' . (int) $rc['ok'] . ' delivered OK, ' . (int) $rc['failed'] . ' failed (per Expo receipts).';
                }
            } catch (Throwable) {
                $_SESSION['push_notif_flash'] = 'Could not refresh receipts.';
            }
        }
        header('Location: push_notifications.php');
        exit;
    }

    $title = trim((string) ($_POST['title'] ?? ''));
    $body = trim((string) ($_POST['body'] ?? ''));
    $mode = (string) ($_POST['mode'] ?? 'broadcast');

    if ($title === '' || $body === '') {
        $flash = 'Title and message are required.';
    } elseif ($mode === 'user' && (int) ($_POST['user_id'] ?? 0) <= 0) {
        $flash = 'Enter a valid user ID.';
    } else {
        try {
            $pdo->beginTransaction();

            $targetUid = null;
            if ($mode === 'user') {
                $targetUid = (int) ($_POST['user_id'] ?? 0);
                $insLog = $pdo->prepare(
                    'INSERT INTO admin_push_logs (admin_id, title, body, audience, target_user_id, recipients_attempted, expo_accepted, expo_rejected, opens_count)
                     VALUES (?,?,?,?,?,0,0,0,0)'
                );
                $insLog->execute([
                    $adminId > 0 ? $adminId : null,
                    $title,
                    mb_substr($body, 0, 500),
                    'user',
                    $targetUid,
                ]);
            } else {
                $insLog = $pdo->prepare(
                    'INSERT INTO admin_push_logs (admin_id, title, body, audience, target_user_id, recipients_attempted, expo_accepted, expo_rejected, opens_count)
                     VALUES (?,?,?,?,NULL,0,0,0,0)'
                );
                $insLog->execute([
                    $adminId > 0 ? $adminId : null,
                    $title,
                    mb_substr($body, 0, 500),
                    'broadcast',
                ]);
            }

            $logId = (int) $pdo->lastInsertId();

            $messages = [];
            if ($mode === 'user' && $targetUid !== null) {
                foreach (ww_push_tokens_for_user($pdo, $targetUid) as $to) {
                    $messages[] = ww_expo_push_build_message($to, $title, $body, [
                        'type' => 'admin',
                        'admin_push_log_id' => (string) $logId,
                    ]);
                }
            } else {
                $st = $pdo->query(
                    'SELECT ut.expo_push_token FROM user_push_tokens ut
                     INNER JOIN users u ON u.id = ut.user_id
                     WHERE u.status = \'verified\' AND ut.expo_push_token LIKE \'ExponentPushToken[%]\''
                );
                while (($to = $st->fetchColumn()) !== false) {
                    $to = (string) $to;
                    $messages[] = ww_expo_push_build_message($to, $title, $body, [
                        'type' => 'admin_broadcast',
                        'admin_push_log_id' => (string) $logId,
                    ]);
                }
            }

            $detail = ww_expo_push_send_detailed($messages);
            $errSample = $detail['error_samples'] !== []
                ? mb_substr(implode(' · ', $detail['error_samples']), 0, 500)
                : null;

            $insTk = $pdo->prepare(
                'INSERT IGNORE INTO admin_push_tickets (log_id, expo_ticket_id) VALUES (?,?)'
            );
            foreach ($detail['ticket_ids'] as $tid) {
                $insTk->execute([$logId, $tid]);
            }

            $pdo->prepare(
                'UPDATE admin_push_logs SET recipients_attempted = ?, expo_accepted = ?, expo_rejected = ?, error_sample = ? WHERE id = ?'
            )->execute([
                count($messages),
                $detail['accepted'],
                $detail['rejected'],
                $errSample,
                $logId,
            ]);

            $pdo->commit();

            if ($mode === 'user' && $targetUid !== null) {
                $flash = 'Sent to user #' . $targetUid . ' (' . count($messages) . ' device(s)). Expo accepted: ' . $detail['accepted'] . ', rejected: ' . $detail['rejected'] . '.';
            } else {
                $flash = 'Broadcast: ' . count($messages) . ' device(s). Expo accepted: ' . $detail['accepted'] . ', rejected: ' . $detail['rejected'] . '.';
            }
        } catch (Throwable) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $flash = 'Could not send. Run database/revisions_admin_push_logs.sql and check PHP curl.';
        }
    }
}

/** @var list<array<string, mixed>> */
$logRows = [];
try {
    $lg = $pdo->query(
        'SELECT id, title, body, audience, target_user_id, recipients_attempted, expo_accepted, expo_rejected,
                delivery_ok, delivery_failed, receipt_checked_at, opens_count, error_sample, created_at
         FROM admin_push_logs ORDER BY id DESC LIMIT 40'
    );
    $logRows = $lg->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    if ($error === '') {
        $error = 'admin_push_logs table missing. Run database/revisions_admin_push_logs.sql.';
    }
    $logRows = [];
}

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<div class="space-y-6">
  <div>
    <p class="text-sm text-slate-500"><a href="<?= htmlspecialchars($home, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand hover:underline">← Dashboard</a></p>
    <h2 class="mt-1 text-lg font-semibold text-slate-900">Push notifications</h2>
    <p class="mt-2 text-sm text-slate-600">
      <span class="font-semibold">Recipients</span> = device tokens targeted.
      <span class="font-semibold">Expo ✓ / ✗</span> = Expo accepted or rejected the message immediately (not the same as delivered to the phone).
      <span class="font-semibold">Delivered / Del. fail</span> = from Expo <em>receipts</em> after you click Refresh delivery (wait ~1 minute after sending).
      <span class="font-semibold">Opens</span> = unique users who tapped the notification (dev/prod build only).
    </p>
  </div>

  <?php if ($error !== '') : ?>
    <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
  <?php else : ?>
    <div class="rounded-xl border border-slate-100 bg-white p-4 text-sm text-slate-700 shadow-panel">
      <p><span class="font-semibold">Registered devices:</span> <?= (int) $tokenCount ?> token(s)</p>
      <p class="mt-1"><span class="font-semibold">Verified users with tokens:</span> <?= (int) $userCount ?></p>
    </div>
  <?php endif; ?>

  <?php if ($flash !== '') : ?>
    <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
  <?php endif; ?>

  <?php if ($error === '') : ?>
  <form method="post" class="space-y-4 rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
    <input type="hidden" name="action" value="send" />
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</label>
      <input name="title" required maxlength="120" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Headline" />
    </div>
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</label>
      <textarea name="body" required rows="4" maxlength="500" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="Body text"></textarea>
    </div>
    <div>
      <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">Audience</label>
      <div class="mt-2 flex flex-wrap gap-4 text-sm">
        <label class="flex items-center gap-2">
          <input type="radio" name="mode" value="broadcast" checked />
          All verified users with a registered device
        </label>
        <label class="flex items-center gap-2">
          <input type="radio" name="mode" value="user" />
          Single user (ID)
        </label>
      </div>
      <div class="mt-3">
        <label class="block text-xs font-semibold uppercase tracking-wide text-slate-500">User ID (for single user)</label>
        <input type="number" name="user_id" min="1" step="1" class="mt-1 w-full max-w-xs rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="123" />
      </div>
    </div>
    <button type="submit" class="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">Send push</button>
  </form>

  <div class="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-panel">
    <div class="border-b border-slate-100 px-6 py-4">
      <h3 class="text-sm font-semibold text-slate-900">Recent sends</h3>
      <p class="mt-1 text-xs text-slate-500">Stats for each campaign. <span class="font-semibold">Refresh delivery</span> calls Expo receipts (wait ~1 min after send).</p>
    </div>
    <div class="overflow-x-auto">
      <?php if ($logRows === []) : ?>
        <p class="px-6 py-10 text-center text-sm text-slate-500">No sends logged yet.</p>
      <?php else : ?>
      <table class="min-w-full divide-y divide-slate-100 text-left text-sm">
        <thead class="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-4 py-3">When</th>
            <th class="px-4 py-3">Audience</th>
            <th class="px-4 py-3">Title</th>
            <th class="px-4 py-3 text-right">Devices</th>
            <th class="px-4 py-3 text-right">Expo ✓</th>
            <th class="px-4 py-3 text-right">Expo ✗</th>
            <th class="px-4 py-3 text-right">Deliv.</th>
            <th class="px-4 py-3 text-right">Fail</th>
            <th class="px-4 py-3 text-right">Opens</th>
            <th class="px-4 py-3">Receipts</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <?php foreach ($logRows as $lr) :
              $aud = (string) ($lr['audience'] ?? '');
              $audLabel = $aud === 'user' ? ('User #' . (int) ($lr['target_user_id'] ?? 0)) : 'Broadcast';
              $tit = mb_substr((string) ($lr['title'] ?? ''), 0, 40);
              $chk = $lr['receipt_checked_at'] ?? null;
              ?>
          <tr class="text-slate-800">
            <td class="whitespace-nowrap px-4 py-3 text-xs text-slate-600"><?= htmlspecialchars((string) ($lr['created_at'] ?? ''), ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-4 py-3 text-xs"><?= htmlspecialchars($audLabel, ENT_QUOTES, 'UTF-8') ?></td>
            <td class="max-w-[200px] truncate px-4 py-3" title="<?= htmlspecialchars((string) ($lr['title'] ?? ''), ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($tit, ENT_QUOTES, 'UTF-8') ?></td>
            <td class="px-4 py-3 text-right tabular-nums"><?= (int) ($lr['recipients_attempted'] ?? 0) ?></td>
            <td class="px-4 py-3 text-right tabular-nums text-emerald-700"><?= (int) ($lr['expo_accepted'] ?? 0) ?></td>
            <td class="px-4 py-3 text-right tabular-nums text-amber-700"><?= (int) ($lr['expo_rejected'] ?? 0) ?></td>
            <td class="px-4 py-3 text-right tabular-nums"><?= (int) ($lr['delivery_ok'] ?? 0) ?></td>
            <td class="px-4 py-3 text-right tabular-nums"><?= (int) ($lr['delivery_failed'] ?? 0) ?></td>
            <td class="px-4 py-3 text-right tabular-nums"><?= (int) ($lr['opens_count'] ?? 0) ?></td>
            <td class="px-4 py-3 text-xs text-slate-500"><?= $chk ? htmlspecialchars((string) $chk, ENT_QUOTES, 'UTF-8') : '—' ?></td>
            <td class="px-4 py-3">
              <form method="post" class="inline">
                <input type="hidden" name="action" value="refresh_receipts" />
                <input type="hidden" name="log_id" value="<?= (int) ($lr['id'] ?? 0) ?>" />
                <button type="submit" class="text-xs font-semibold text-indigo-600 hover:underline">Refresh delivery</button>
              </form>
            </td>
          </tr>
          <?php endforeach; ?>
        </tbody>
      </table>
      <?php endif; ?>
    </div>
  </div>
  <?php endif; ?>
</div>

<?php require __DIR__ . '/partials/shell_close.php';
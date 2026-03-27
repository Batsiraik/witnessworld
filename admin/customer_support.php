<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';
require_once __DIR__ . '/../api/lib/push_notify.php';

$pageTitle = 'Customer support';
$activeNav = 'support';

$pdo = witnessworld_pdo();
$suid = (int) (ww_get_setting($pdo, 'support_user_id', '0') ?? 0);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'customer_support.php' : $base . '/customer_support.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && $suid > 0) {
    $action = (string) ($_POST['action'] ?? '');
    if ($action === 'reply') {
        $cid = (int) ($_POST['conversation_id'] ?? 0);
        $body = trim((string) ($_POST['body'] ?? ''));
        $redirectCid = $cid;
        if ($cid > 0 && $body !== '' && mb_strlen($body) <= 6000) {
            try {
                $st = $pdo->prepare(
                    'SELECT id, user_low_id, user_high_id FROM conversations WHERE id = ? AND context_key = ? LIMIT 1'
                );
                $st->execute([$cid, 'support']);
                $c = $st->fetch(PDO::FETCH_ASSOC);
                if ($c) {
                    $low = (int) $c['user_low_id'];
                    $high = (int) $c['user_high_id'];
                    $memberId = $low === $suid ? $high : $low;
                    $pdo->beginTransaction();
                    $pdo->prepare(
                        'INSERT INTO messages (conversation_id, sender_user_id, body) VALUES (?,?,?)'
                    )->execute([$cid, $suid, $body]);
                    $pdo->prepare(
                        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE id = ?'
                    )->execute([$cid]);
                    $pdo->commit();
                    ww_push_to_user(
                        $pdo,
                        $memberId,
                        'Support team',
                        'You have a new message from the support team.',
                        [
                            'type' => 'support_reply',
                            'conversation_id' => (string) $cid,
                        ]
                    );
                }
            } catch (Throwable) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
            }
        }
        $qs = $redirectCid > 0 ? ('?conversation_id=' . $redirectCid) : '';
        header('Location: ' . $self . $qs);
        exit;
    }
}

$openId = (int) ($_GET['conversation_id'] ?? 0);
if ($openId > 0 && $suid > 0) {
    try {
        $chk = $pdo->prepare(
            'SELECT id FROM conversations WHERE id = ? AND context_key = ? LIMIT 1'
        );
        $chk->execute([$openId, 'support']);
        if ($chk->fetchColumn()) {
            $pdo->prepare(
                'UPDATE conversations SET support_last_read_at = CURRENT_TIMESTAMP WHERE id = ?'
            )->execute([$openId]);
        }
    } catch (Throwable) {
        /* ignore */
    }
}

/** @var list<array<string, mixed>> $threads */
$threads = [];
if ($suid > 0) {
    try {
        $sql = 'SELECT c.id AS conversation_id, c.last_message_at, c.member_last_read_at,
                c.support_last_read_at, m.id AS member_id, m.first_name, m.last_name, m.email, m.status AS member_status
                FROM conversations c
                INNER JOIN users m ON m.id = IF(c.user_low_id = ?, c.user_high_id, c.user_low_id)
                WHERE c.context_key = ?
                ORDER BY COALESCE(c.last_message_at, c.created_at) DESC';
        $st = $pdo->prepare($sql);
        $st->execute([$suid, 'support']);
        $threads = $st->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable) {
        $threads = [];
    }
}

function ww_admin_support_unread_count(PDO $pdo, int $conversationId, int $supportUserId, ?string $supportReadAt): int
{
    try {
        if ($supportReadAt === null || $supportReadAt === '') {
            $st = $pdo->prepare(
                'SELECT COUNT(*) FROM messages WHERE conversation_id = ? AND sender_user_id != ?'
            );
            $st->execute([$conversationId, $supportUserId]);

            return (int) $st->fetchColumn();
        }
        $st = $pdo->prepare(
            'SELECT COUNT(*) FROM messages
             WHERE conversation_id = ? AND sender_user_id != ? AND created_at > ?'
        );
        $st->execute([$conversationId, $supportUserId, $supportReadAt]);

        return (int) $st->fetchColumn();
    } catch (Throwable) {
        return 0;
    }
}

function ww_admin_member_read_last_support(
    PDO $pdo,
    int $conversationId,
    int $supportUserId,
    ?string $memberReadAt
): string {
    try {
        $st = $pdo->prepare(
            'SELECT created_at FROM messages
             WHERE conversation_id = ? AND sender_user_id = ?
             ORDER BY id DESC LIMIT 1'
        );
        $st->execute([$conversationId, $supportUserId]);
        $row = $st->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return '—';
        }
        $sent = (string) $row['created_at'];
        if ($memberReadAt !== null && $memberReadAt !== '' && strtotime($memberReadAt) >= strtotime($sent)) {
            return 'Read';
        }

        return 'Unread';
    } catch (Throwable) {
        return '—';
    }
}

/** @var list<array<string, mixed>> $messages */
$messages = [];
if ($openId > 0 && $suid > 0) {
    try {
        $ok = $pdo->prepare(
            'SELECT id FROM conversations WHERE id = ? AND context_key = ? LIMIT 1'
        );
        $ok->execute([$openId, 'support']);
        if ($ok->fetchColumn()) {
            $st = $pdo->prepare(
                'SELECT m.id, m.sender_user_id, m.body, m.created_at,
                        ma.id AS att_id, ma.file_name AS att_fn, ma.mime_type AS att_mime
                 FROM messages m
                 LEFT JOIN message_attachments ma ON ma.message_id = m.id
                 WHERE m.conversation_id = ?
                 ORDER BY m.id ASC'
            );
            $st->execute([$openId]);
            $messages = $st->fetchAll(PDO::FETCH_ASSOC);
        }
    } catch (Throwable) {
        $messages = [];
    }
}

$userPhp = ($base === '' || $base === '.') ? 'user.php' : $base . '/user.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($suid <= 0): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    Set <strong>Support user ID</strong> in
    <a href="<?= htmlspecialchars($base === '' || $base === '.' ? 'settings.php' : $base . '/settings.php', ENT_QUOTES, 'UTF-8') ?>" class="font-semibold underline">Settings</a>
    to a real app user account that will appear as “Support” in the app. Use a dedicated verified member account (e.g. “Witness Support”).
  </div>
<?php endif; ?>

<div class="grid gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
  <div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
    <div class="border-b border-slate-100 px-4 py-3">
      <h2 class="text-sm font-semibold text-slate-900">Conversations</h2>
      <p class="mt-0.5 text-xs text-slate-500">Users who messaged support</p>
    </div>
    <ul class="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
      <?php if ($threads === []): ?>
        <li class="px-4 py-8 text-center text-sm text-slate-500">No threads yet.</li>
      <?php else: ?>
        <?php foreach ($threads as $t): ?>
          <?php
            $cid = (int) $t['conversation_id'];
            $unread = ww_admin_support_unread_count($pdo, $cid, $suid, $t['support_last_read_at'] !== null ? (string) $t['support_last_read_at'] : null);
            $readLbl = ww_admin_member_read_last_support(
                $pdo,
                $cid,
                $suid,
                $t['member_last_read_at'] !== null ? (string) $t['member_last_read_at'] : null
            );
            $name = trim((string) $t['first_name'] . ' ' . (string) $t['last_name']);
            if ($name === '') {
                $name = (string) $t['email'];
            }
            $active = $openId === $cid;
            ?>
          <li>
            <a
              href="<?= htmlspecialchars($self . '?conversation_id=' . $cid, ENT_QUOTES, 'UTF-8') ?>"
              class="block px-4 py-3 text-sm transition hover:bg-slate-50 <?= $active ? 'bg-brand/10 ring-1 ring-inset ring-brand/20' : '' ?>"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="font-semibold text-slate-900"><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></span>
                <?php if ($unread > 0): ?>
                  <span class="shrink-0 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white"><?= (int) $unread ?></span>
                <?php endif; ?>
              </div>
              <p class="mt-1 truncate text-xs text-slate-500"><?= htmlspecialchars((string) $t['email'], ENT_QUOTES, 'UTF-8') ?></p>
              <p class="mt-1 text-[11px] text-slate-400">
                Your last reply: <span class="font-medium <?= $readLbl === 'Unread' ? 'text-amber-700' : 'text-emerald-700' ?>"><?= htmlspecialchars($readLbl, ENT_QUOTES, 'UTF-8') ?></span>
              </p>
            </a>
          </li>
        <?php endforeach; ?>
      <?php endif; ?>
    </ul>
  </div>

  <div class="rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden flex flex-col min-h-[320px]">
    <?php if ($openId <= 0): ?>
      <div class="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Select a user on the left to view messages and reply.
      </div>
    <?php elseif ($suid <= 0): ?>
      <div class="flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
        Configure support user ID first.
      </div>
    <?php else: ?>
      <?php
        $hdrMember = null;
        foreach ($threads as $t) {
            if ((int) $t['conversation_id'] === $openId) {
                $hdrMember = $t;
                break;
            }
        }
        $mid = $hdrMember ? (int) $hdrMember['member_id'] : 0;
        $hdrName = '';
        if ($hdrMember) {
            $hdrName = trim((string) $hdrMember['first_name'] . ' ' . (string) $hdrMember['last_name']);
            if ($hdrName === '') {
                $hdrName = (string) $hdrMember['email'];
            }
        }
        ?>
      <div class="border-b border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold text-slate-900"><?= htmlspecialchars($hdrName !== '' ? $hdrName : 'Conversation', ENT_QUOTES, 'UTF-8') ?></h2>
          <?php if ($hdrMember): ?>
            <p class="text-xs text-slate-500"><?= htmlspecialchars((string) $hdrMember['email'], ENT_QUOTES, 'UTF-8') ?></p>
          <?php endif; ?>
        </div>
        <?php if ($mid > 0): ?>
          <a
            href="<?= htmlspecialchars($userPhp . '?id=' . $mid, ENT_QUOTES, 'UTF-8') ?>"
            class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
          >
            Open user profile
          </a>
        <?php endif; ?>
      </div>
      <div class="flex-1 overflow-y-auto max-h-[50vh] space-y-3 p-4 bg-slate-50/80">
        <?php foreach ($messages as $msg): ?>
          <?php
            $isStaff = (int) $msg['sender_user_id'] === $suid;
            $attId = isset($msg['att_id']) ? (int) $msg['att_id'] : 0;
            ?>
          <div class="flex <?= $isStaff ? 'justify-end' : 'justify-start' ?>">
            <div class="max-w-[90%] rounded-2xl border px-3 py-2 text-sm shadow-sm <?= $isStaff ? 'border-brand/30 bg-brand/10 text-slate-900' : 'border-slate-200 bg-white text-slate-800' ?>">
              <?php if (trim((string) $msg['body']) !== ''): ?>
                <p class="whitespace-pre-wrap"><?= htmlspecialchars((string) $msg['body'], ENT_QUOTES, 'UTF-8') ?></p>
              <?php endif; ?>
              <?php if ($attId > 0): ?>
                <p class="mt-2 text-xs font-semibold text-slate-600">
                  📷 Image:
                  <a class="text-brand underline" target="_blank" rel="noopener" href="<?= htmlspecialchars(($base === '' || $base === '.' ? '' : $base) . '/support_attachment.php?id=' . $attId, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars((string) $msg['att_fn'], ENT_QUOTES, 'UTF-8') ?></a>
                  <span class="text-slate-400">(<?= htmlspecialchars((string) $msg['att_mime'], ENT_QUOTES, 'UTF-8') ?>)</span>
                </p>
              <?php endif; ?>
              <p class="mt-1 text-[10px] text-slate-400"><?= htmlspecialchars(substr((string) $msg['created_at'], 0, 16), ENT_QUOTES, 'UTF-8') ?></p>
            </div>
          </div>
        <?php endforeach; ?>
        <?php if ($messages === []): ?>
          <p class="text-center text-sm text-slate-500 py-6">No messages in this thread yet.</p>
        <?php endif; ?>
      </div>
      <form method="post" class="border-t border-slate-100 p-4 space-y-2 bg-white">
        <input type="hidden" name="action" value="reply" />
        <input type="hidden" name="conversation_id" value="<?= (int) $openId ?>" />
        <label class="text-xs font-semibold text-slate-600">Reply as support</label>
        <textarea
          name="body"
          rows="3"
           class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Type your reply…"
          required
          maxlength="6000"
        ></textarea>
        <button type="submit" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-95">
          Send &amp; notify user
        </button>
        <p class="text-[11px] text-slate-500">The user receives a push notification when you send.</p>
      </form>
    <?php endif; ?>
  </div>
</div>

<?php
require __DIR__ . '/partials/shell_close.php';

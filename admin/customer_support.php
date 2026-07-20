<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';
require_once __DIR__ . '/includes/admin_notifications.php';
require_once __DIR__ . '/../api/lib/push_notify.php';

$pageTitle = 'Customer support';
$activeNav = 'support';

$pdo = witnessworld_pdo();
$suid = (int) (ww_get_setting($pdo, 'support_user_id', '0') ?? 0);

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$self = ($base === '' || $base === '.') ? 'customer_support.php' : $base . '/customer_support.php';

$threadFilter = strtolower(trim((string) ($_GET['filter'] ?? 'all')));
if (!in_array($threadFilter, ['all', 'with_messages', 'empty'], true)) {
    $threadFilter = 'all';
}

/**
 * Delete a support conversation and any attachment files on disk.
 */
function ww_admin_delete_support_conversation(PDO $pdo, int $conversationId, int $supportUserId): bool
{
    if ($conversationId <= 0 || $supportUserId <= 0) {
        return false;
    }

    $st = $pdo->prepare(
        'SELECT id FROM conversations WHERE id = ? AND context_key = ? LIMIT 1'
    );
    $st->execute([$conversationId, 'support']);
    if (!$st->fetchColumn()) {
        return false;
    }

    $files = [];
    try {
        $att = $pdo->prepare(
            'SELECT ma.storage_name
             FROM message_attachments ma
             INNER JOIN messages m ON m.id = ma.message_id
             WHERE m.conversation_id = ?'
        );
        $att->execute([$conversationId]);
        $files = $att->fetchAll(PDO::FETCH_COLUMN);
    } catch (Throwable) {
        $files = [];
    }

    $pdo->prepare('DELETE FROM conversations WHERE id = ? AND context_key = ?')
        ->execute([$conversationId, 'support']);

    try {
        $pdo->prepare(
            "DELETE FROM admin_notifications WHERE ref_id = ? AND type IN ('support_message','support_ticket')"
        )->execute([$conversationId]);
    } catch (Throwable) {
        /* ignore */
    }

    $dir = dirname(__DIR__) . '/uploads/message_attachments';
    foreach ($files as $name) {
        $name = basename((string) $name);
        if ($name === '' || $name === '.' || $name === '..') {
            continue;
        }
        $path = $dir . DIRECTORY_SEPARATOR . $name;
        if (is_file($path)) {
            @unlink($path);
        }
    }

    return true;
}

/**
 * Delete support threads that have zero messages.
 *
 * @return int Number deleted
 */
function ww_admin_delete_empty_support_conversations(PDO $pdo, int $supportUserId): int
{
    if ($supportUserId <= 0) {
        return 0;
    }

    $st = $pdo->prepare(
        'SELECT c.id
         FROM conversations c
         WHERE c.context_key = ?
           AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)'
    );
    $st->execute(['support']);
    $ids = $st->fetchAll(PDO::FETCH_COLUMN);
    $deleted = 0;
    foreach ($ids as $id) {
        if (ww_admin_delete_support_conversation($pdo, (int) $id, $supportUserId)) {
            $deleted++;
        }
    }

    return $deleted;
}

$flash = '';
$flashTone = 'ok';

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
                        'Customer Support',
                        'You have a new message from Customer Support.',
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

    if ($action === 'delete_conversation') {
        $cid = (int) ($_POST['conversation_id'] ?? 0);
        if ($cid > 0 && ww_admin_delete_support_conversation($pdo, $cid, $suid)) {
            $filterQs = $threadFilter !== 'all' ? ('?filter=' . urlencode($threadFilter) . '&') : '?';
            header('Location: ' . $self . $filterQs . 'deleted=1');
            exit;
        }
        header('Location: ' . $self . '?error=delete');
        exit;
    }

    if ($action === 'delete_empty') {
        $n = ww_admin_delete_empty_support_conversations($pdo, $suid);
        header('Location: ' . $self . '?cleared=' . $n);
        exit;
    }
}

if (isset($_GET['deleted']) && $_GET['deleted'] === '1') {
    $flash = 'Conversation deleted.';
}
if (isset($_GET['cleared'])) {
    $n = (int) $_GET['cleared'];
    $flash = $n === 0
        ? 'No empty conversations to clear.'
        : ('Cleared ' . $n . ' empty conversation' . ($n === 1 ? '' : 's') . '.');
}
if (isset($_GET['error']) && $_GET['error'] === 'delete') {
    $flash = 'Could not delete that conversation.';
    $flashTone = 'err';
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
            ww_admin_notifications_mark_conversation_read($pdo, $openId);
        }
    } catch (Throwable) {
        /* ignore */
    }
}

/** @var list<array<string, mixed>> $threads */
$threads = [];
$emptyThreadCount = 0;
if ($suid > 0) {
    try {
        $sql = 'SELECT c.id AS conversation_id, c.last_message_at, c.member_last_read_at,
                c.support_last_read_at, m.id AS member_id, m.first_name, m.last_name, m.email, m.status AS member_status,
                (SELECT COUNT(*) FROM messages msg WHERE msg.conversation_id = c.id) AS message_count
                FROM conversations c
                INNER JOIN users m ON m.id = IF(c.user_low_id = ?, c.user_high_id, c.user_low_id)
                WHERE c.context_key = ?';
        if ($threadFilter === 'empty') {
            $sql .= ' AND NOT EXISTS (SELECT 1 FROM messages msg WHERE msg.conversation_id = c.id)';
        } elseif ($threadFilter === 'with_messages') {
            $sql .= ' AND EXISTS (SELECT 1 FROM messages msg WHERE msg.conversation_id = c.id)';
        }
        $sql .= ' ORDER BY COALESCE(c.last_message_at, c.created_at) DESC';
        $st = $pdo->prepare($sql);
        $st->execute([$suid, 'support']);
        $threads = $st->fetchAll(PDO::FETCH_ASSOC);

        $emptySt = $pdo->prepare(
            'SELECT COUNT(*) FROM conversations c
             WHERE c.context_key = ?
               AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)'
        );
        $emptySt->execute(['support']);
        $emptyThreadCount = (int) $emptySt->fetchColumn();
    } catch (Throwable) {
        $threads = [];
        $emptyThreadCount = 0;
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
$filterSelf = static function (string $key) use ($self): string {
    return $key === 'all' ? $self : ($self . '?filter=' . urlencode($key));
};

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border px-4 py-3 text-sm font-medium <?= $flashTone === 'err' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800' ?>">
    <?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?>
  </div>
<?php endif; ?>

<?php if ($suid <= 0): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
    Set <strong>Support user ID</strong> in
    <a href="<?= htmlspecialchars($base === '' || $base === '.' ? 'settings.php' : $base . '/settings.php', ENT_QUOTES, 'UTF-8') ?>" class="font-semibold underline">Settings</a>
    to a real app user account that will appear as “Support” in the app. Use a dedicated verified member account (e.g. “Witness Support”).
  </div>
<?php endif; ?>

<div class="admin-support-layout grid gap-6 lg:grid-cols-[minmax(240px,320px)_1fr]<?= $openId > 0 ? ' admin-support-chat-open' : '' ?>">
  <div class="admin-support-list rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden">
    <div class="border-b border-slate-100 px-4 py-3 space-y-3">
      <div>
        <h2 class="text-sm font-semibold text-slate-900">Conversations</h2>
        <p class="mt-0.5 text-xs text-slate-500">Opening Support in the app creates a thread even before the user types — empty ones are labeled below.</p>
      </div>
      <div class="flex flex-wrap gap-1.5">
        <?php
        $filters = ['all' => 'All', 'with_messages' => 'With messages', 'empty' => 'Empty'];
        foreach ($filters as $key => $label):
            $active = $threadFilter === $key;
            ?>
          <a
            href="<?= htmlspecialchars($filterSelf($key), ENT_QUOTES, 'UTF-8') ?>"
            class="rounded-lg border px-2.5 py-1 text-[11px] font-semibold <?= $active ? 'border-brand bg-brand/10 text-brand-dark' : 'border-slate-200 text-slate-600 hover:bg-slate-50' ?>"
          ><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?><?= $key === 'empty' && $emptyThreadCount > 0 ? ' (' . $emptyThreadCount . ')' : '' ?></a>
        <?php endforeach; ?>
      </div>
      <?php if ($emptyThreadCount > 0 && $suid > 0): ?>
        <form method="post" onsubmit="return confirm('Delete all <?= (int) $emptyThreadCount ?> empty support conversation<?= $emptyThreadCount === 1 ? '' : 's' ?>? This cannot be undone.');">
          <input type="hidden" name="action" value="delete_empty" />
          <button type="submit" class="admin-btn admin-btn--danger admin-btn--sm w-full sm:w-auto">
            Clear <?= (int) $emptyThreadCount ?> empty thread<?= $emptyThreadCount === 1 ? '' : 's' ?>
          </button>
        </form>
      <?php endif; ?>
    </div>
    <ul class="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
      <?php if ($threads === []): ?>
        <li class="px-4 py-8 text-center text-sm text-slate-500">
          <?= $threadFilter === 'empty' ? 'No empty threads.' : ($threadFilter === 'with_messages' ? 'No threads with messages yet.' : 'No threads yet.') ?>
        </li>
      <?php else: ?>
        <?php foreach ($threads as $t): ?>
          <?php
            $cid = (int) $t['conversation_id'];
            $msgCount = (int) ($t['message_count'] ?? 0);
            $isEmpty = $msgCount === 0;
            $unread = $isEmpty ? 0 : ww_admin_support_unread_count($pdo, $cid, $suid, $t['support_last_read_at'] !== null ? (string) $t['support_last_read_at'] : null);
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
            $openHref = $self . '?conversation_id=' . $cid . ($threadFilter !== 'all' ? '&filter=' . urlencode($threadFilter) : '');
            ?>
          <li>
            <a
              href="<?= htmlspecialchars($openHref, ENT_QUOTES, 'UTF-8') ?>"
              class="block px-4 py-3 text-sm transition hover:bg-slate-50 <?= $active ? 'bg-brand/10 ring-1 ring-inset ring-brand/20' : '' ?> <?= $isEmpty ? 'opacity-75' : '' ?>"
            >
              <div class="flex items-start justify-between gap-2">
                <span class="font-semibold text-slate-900"><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></span>
                <span class="flex shrink-0 items-center gap-1">
                  <?php if ($isEmpty): ?>
                    <span class="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">Empty</span>
                  <?php elseif ($unread > 0): ?>
                    <span class="rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-white"><?= (int) $unread ?></span>
                  <?php endif; ?>
                </span>
              </div>
              <p class="mt-1 truncate text-xs text-slate-500"><?= htmlspecialchars((string) $t['email'], ENT_QUOTES, 'UTF-8') ?></p>
              <?php if ($isEmpty): ?>
                <p class="mt-1 text-[11px] text-slate-400">Opened Support — no message sent</p>
              <?php else: ?>
                <p class="mt-1 text-[11px] text-slate-400">
                  <?= (int) $msgCount ?> message<?= $msgCount === 1 ? '' : 's' ?>
                  · Your last reply: <span class="font-medium <?= $readLbl === 'Unread' ? 'text-amber-700' : 'text-emerald-700' ?>"><?= htmlspecialchars($readLbl, ENT_QUOTES, 'UTF-8') ?></span>
                </p>
              <?php endif; ?>
            </a>
          </li>
        <?php endforeach; ?>
      <?php endif; ?>
    </ul>
  </div>

  <div class="admin-support-chat rounded-2xl border border-slate-100 bg-white shadow-panel overflow-hidden flex flex-col min-h-[320px] lg:min-h-[calc(100vh-8rem)]">
    <?php if ($openId <= 0): ?>
      <div class="admin-support-chat-empty flex flex-1 items-center justify-center p-8 text-sm text-slate-500">
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
        $openIsEmpty = $messages === [];
        ?>
      <div class="admin-support-chat-header border-b border-slate-100 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <a
            href="<?= htmlspecialchars($filterSelf($threadFilter), ENT_QUOTES, 'UTF-8') ?>"
            class="admin-support-back lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-brand/40 hover:text-brand"
            aria-label="Back to conversations"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </a>
          <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold text-slate-900"><?= htmlspecialchars($hdrName !== '' ? $hdrName : 'Conversation', ENT_QUOTES, 'UTF-8') ?></h2>
          <?php if ($hdrMember): ?>
            <p class="truncate text-xs text-slate-500"><?= htmlspecialchars((string) $hdrMember['email'], ENT_QUOTES, 'UTF-8') ?></p>
          <?php endif; ?>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <?php if ($mid > 0): ?>
            <a
              href="<?= htmlspecialchars($userPhp . '?id=' . $mid, ENT_QUOTES, 'UTF-8') ?>"
              class="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-slate-300"
            >
              Open user profile
            </a>
          <?php endif; ?>
          <form method="post" onsubmit="return confirm('Delete this conversation<?= $openIsEmpty ? '' : ' and all its messages' ?>? This cannot be undone.');">
            <input type="hidden" name="action" value="delete_conversation" />
            <input type="hidden" name="conversation_id" value="<?= (int) $openId ?>" />
            <button type="submit" class="admin-btn admin-btn--danger admin-btn--sm">Delete thread</button>
          </form>
        </div>
      </div>
      <div class="admin-support-messages flex-1 min-h-0 overflow-y-auto max-h-[50vh] lg:max-h-none space-y-3 p-4 bg-slate-50/80">
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
                <?php
                  $attHref = ($base === '' || $base === '.' ? '' : $base) . '/support_attachment.php?id=' . $attId;
                  $attMimeLower = strtolower(trim((string) $msg['att_mime']));
                  $attIsImage = str_starts_with($attMimeLower, 'image/');
                  ?>
                <div class="mt-2 space-y-2">
                  <?php if ($attIsImage): ?>
                    <a href="<?= htmlspecialchars($attHref, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener" class="block rounded-xl border border-slate-200 bg-slate-50/90 p-1 hover:border-brand/40" title="Open full size">
                      <img
                        src="<?= htmlspecialchars($attHref, ENT_QUOTES, 'UTF-8') ?>"
                        alt="<?= htmlspecialchars((string) $msg['att_fn'], ENT_QUOTES, 'UTF-8') ?>"
                        class="max-h-72 w-full rounded-lg object-contain"
                        loading="lazy"
                      />
                    </a>
                    <p class="text-[11px] text-slate-500">
                      <span class="font-semibold text-slate-600">Attachment</span>
                      · <?= htmlspecialchars((string) $msg['att_fn'], ENT_QUOTES, 'UTF-8') ?>
                      · <?= htmlspecialchars((string) $msg['att_mime'], ENT_QUOTES, 'UTF-8') ?>
                      · <a class="text-brand underline" href="<?= htmlspecialchars($attHref, ENT_QUOTES, 'UTF-8') ?>" target="_blank" rel="noopener">Open full size</a>
                    </p>
                  <?php else: ?>
                    <p class="text-xs font-semibold text-slate-600">
                      📎 File:
                      <a class="text-brand underline" target="_blank" rel="noopener" href="<?= htmlspecialchars($attHref, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars((string) $msg['att_fn'], ENT_QUOTES, 'UTF-8') ?></a>
                      <span class="text-slate-400">(<?= htmlspecialchars((string) $msg['att_mime'], ENT_QUOTES, 'UTF-8') ?>)</span>
                    </p>
                  <?php endif; ?>
                </div>
              <?php endif; ?>
              <p class="mt-1 text-[10px] text-slate-400"><?= htmlspecialchars(substr((string) $msg['created_at'], 0, 16), ENT_QUOTES, 'UTF-8') ?></p>
            </div>
          </div>
        <?php endforeach; ?>
        <?php if ($messages === []): ?>
          <p class="text-center text-sm text-slate-500 py-6">No messages in this thread yet. You can delete it with <strong>Delete thread</strong> above.</p>
        <?php endif; ?>
      </div>
      <form method="post" class="admin-support-reply border-t border-slate-100 p-4 space-y-2 bg-white shrink-0">
        <input type="hidden" name="action" value="reply" />
        <input type="hidden" name="conversation_id" value="<?= (int) $openId ?>" />
        <label class="text-xs font-semibold text-slate-600">Reply as Customer Support</label>
        <textarea
          name="body"
          rows="3"
           class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          placeholder="Type your reply…"
          required
          maxlength="6000"
        ></textarea>
        <button type="submit" class="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-95 sm:w-auto">
          Send &amp; notify user
        </button>
        <p class="text-[11px] text-slate-500">The user receives a push notification when you send.</p>
      </form>
    <?php endif; ?>
  </div>
</div>

<?php
require __DIR__ . '/partials/shell_close.php';

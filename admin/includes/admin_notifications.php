<?php

declare(strict_types=1);

/**
 * In-app admin notification inbox (header bell).
 */

function ww_admin_notification_add(
    PDO $pdo,
    string $type,
    string $title,
    string $body,
    ?string $linkUrl = null,
    ?int $refId = null
): void {
    if (trim($title) === '') {
        return;
    }
    try {
        $pdo->prepare(
            'INSERT INTO admin_notifications (type, title, body, link_url, ref_id) VALUES (?,?,?,?,?)'
        )->execute([
            mb_substr($type !== '' ? $type : 'general', 0, 64),
            mb_substr(trim($title), 0, 200),
            mb_substr(trim($body), 0, 500),
            $linkUrl !== null && $linkUrl !== '' ? mb_substr($linkUrl, 0, 500) : null,
            $refId !== null && $refId > 0 ? $refId : null,
        ]);
    } catch (Throwable) {
        // Table may not exist until migration is applied.
    }
}

function ww_admin_notification_support_message(
    PDO $pdo,
    int $conversationId,
    int $memberUserId,
    string $preview
): void {
    if ($conversationId <= 0 || $memberUserId <= 0) {
        return;
    }

    $name = 'A member';
    try {
        $st = $pdo->prepare('SELECT first_name, last_name, email FROM users WHERE id = ? LIMIT 1');
        $st->execute([$memberUserId]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        if ($u) {
            $fn = trim((string) ($u['first_name'] ?? ''));
            $ln = trim((string) ($u['last_name'] ?? ''));
            $full = trim($fn . ' ' . $ln);
            if ($full !== '') {
                $name = $full;
            } elseif (trim((string) ($u['email'] ?? '')) !== '') {
                $name = trim((string) $u['email']);
            }
        }
    } catch (Throwable) {
    }

    $body = $preview !== '' ? $preview : 'Sent a message';
    ww_admin_notification_add(
        $pdo,
        'support_message',
        'Support message from ' . $name,
        $body,
        'customer_support.php?conversation_id=' . $conversationId,
        $conversationId
    );
}

/**
 * @return list<array<string, mixed>>
 */
function ww_admin_notifications_list(PDO $pdo, int $limit = 40): array
{
    /** @var list<array<string, mixed>> */
    $rows = [];
    try {
        $st = $pdo->query(
            'SELECT id, type, title, body, link_url, ref_id, is_read, created_at
             FROM admin_notifications
             ORDER BY created_at DESC
             LIMIT ' . max(1, min(100, $limit))
        );
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[] = [
                'id' => (int) $r['id'],
                'type' => (string) ($r['type'] ?? 'general'),
                'title' => (string) $r['title'],
                'body' => (string) $r['body'],
                'link_url' => $r['link_url'] !== null ? (string) $r['link_url'] : null,
                'ref_id' => $r['ref_id'] !== null ? (int) $r['ref_id'] : null,
                'is_read' => (int) ($r['is_read'] ?? 0) === 1,
                'created_at' => (string) $r['created_at'],
            ];
        }
    } catch (Throwable) {
    }

    return $rows;
}

function ww_admin_notifications_unread_count(PDO $pdo): int
{
    try {
        return (int) $pdo->query('SELECT COUNT(*) FROM admin_notifications WHERE is_read = 0')->fetchColumn();
    } catch (Throwable) {
        return 0;
    }
}

function ww_admin_notifications_mark_all_read(PDO $pdo): void
{
    try {
        $pdo->exec('UPDATE admin_notifications SET is_read = 1 WHERE is_read = 0');
    } catch (Throwable) {
    }
}

function ww_admin_notifications_mark_conversation_read(PDO $pdo, int $conversationId): void
{
    if ($conversationId <= 0) {
        return;
    }
    try {
        $pdo->prepare(
            'UPDATE admin_notifications SET is_read = 1
             WHERE is_read = 0 AND ref_id = ? AND type IN (\'support_message\', \'support_ticket\')'
        )->execute([$conversationId]);
    } catch (Throwable) {
    }
}

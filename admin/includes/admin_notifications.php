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

/**
 * Public admin panel base URL for email links (no trailing slash).
 */
function ww_admin_public_base_url(): string
{
    if (defined('WW_PUBLIC_BASE')) {
        $base = rtrim((string) WW_PUBLIC_BASE, '/');
        if ($base !== '') {
            return $base . '/admin';
        }
    }
    return 'https://witnessworldconnect.com/admin';
}

function ww_admin_user_display_name(PDO $pdo, int $userId): string
{
    if ($userId <= 0) {
        return 'A member';
    }
    try {
        $st = $pdo->prepare('SELECT first_name, last_name, email, username FROM users WHERE id = ? LIMIT 1');
        $st->execute([$userId]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        if (!$u) {
            return 'A member';
        }
        $full = trim((string) ($u['first_name'] ?? '') . ' ' . (string) ($u['last_name'] ?? ''));
        if ($full !== '') {
            return $full;
        }
        $email = trim((string) ($u['email'] ?? ''));
        if ($email !== '') {
            return $email;
        }
        $un = trim((string) ($u['username'] ?? ''));
        return $un !== '' ? $un : 'A member';
    } catch (Throwable) {
        return 'A member';
    }
}

/**
 * @return list<string>
 */
function ww_admin_alert_recipient_emails(PDO $pdo): array
{
    require_once __DIR__ . '/settings_store.php';
    $out = [];
    $support = strtolower(trim((string) ww_get_setting($pdo, 'support_email', '')));
    if ($support !== '' && filter_var($support, FILTER_VALIDATE_EMAIL)) {
        $out[$support] = true;
    }
    try {
        $st = $pdo->query('SELECT email FROM admins WHERE email IS NOT NULL AND email != \'\'');
        foreach ($st->fetchAll(PDO::FETCH_COLUMN) as $email) {
            $e = strtolower(trim((string) $email));
            if ($e !== '' && filter_var($e, FILTER_VALIDATE_EMAIL)) {
                $out[$e] = true;
            }
        }
    } catch (Throwable) {
    }
    return array_keys($out);
}

/**
 * In-app bell notification + email to admins for items needing review.
 */
function ww_admin_submission_alert(
    PDO $pdo,
    string $type,
    string $title,
    string $body,
    string $relativeAdminLink,
    ?int $refId,
    string $emailHeading,
    string $emailIntro,
    string $emailDetailHtml
): void {
    ww_admin_notification_add($pdo, $type, $title, $body, $relativeAdminLink, $refId);

    $recipients = ww_admin_alert_recipient_emails($pdo);
    if ($recipients === []) {
        return;
    }

    $ctaUrl = ww_admin_public_base_url() . '/' . ltrim($relativeAdminLink, '/');
    require_once dirname(__DIR__, 2) . '/api/lib/EmailTemplates.php';
    require_once dirname(__DIR__, 2) . '/api/lib/Mailer.php';

    $logoUrl = null;
    if (defined('WW_EMAIL_LOGO_URL') && (string) WW_EMAIL_LOGO_URL !== '') {
        $logoUrl = (string) WW_EMAIL_LOGO_URL;
    }

    $tpl = EmailTemplates::adminActionRequired(
        $emailHeading,
        $emailIntro,
        $emailDetailHtml,
        'Review in admin panel',
        $ctaUrl,
        $logoUrl
    );
    $subject = 'WWC admin: ' . $emailHeading;
    $mailer = new Mailer($pdo);
    foreach ($recipients as $to) {
        try {
            $mailer->send($to, 'WWC Admin', $subject, $tpl['html'], $tpl['text']);
        } catch (Throwable) {
            error_log('[WitnessWorld] Admin alert email failed for ' . $to);
        }
    }
}

function ww_admin_alert_pending_listing(
    PDO $pdo,
    int $listingId,
    string $listingTitle,
    string $listingType,
    int $userId,
    bool $resubmitted = false
): void {
    if ($listingId <= 0) {
        return;
    }
    $member = ww_admin_user_display_name($pdo, $userId);
    $typeLabel = match ($listingType) {
        'service' => 'Service listing',
        'community' => 'Community post',
        default => 'Marketplace listing',
    };
    $verb = $resubmitted ? 'resubmitted' : 'submitted';
    $title = ($resubmitted ? 'Listing resubmitted: ' : 'New listing: ') . mb_substr($listingTitle, 0, 120);
    $body = $typeLabel . ' from ' . $member . ' — pending approval';
    $detail = '<strong>' . htmlspecialchars($typeLabel, ENT_QUOTES, 'UTF-8') . '</strong><br>'
        . htmlspecialchars($listingTitle, ENT_QUOTES, 'UTF-8') . '<br><br>'
        . 'Member: ' . htmlspecialchars($member, ENT_QUOTES, 'UTF-8');
    ww_admin_submission_alert(
        $pdo,
        'pending_listing',
        $title,
        $body,
        'listing.php?id=' . $listingId,
        $listingId,
        $resubmitted ? 'Listing resubmitted for review' : 'New listing awaiting approval',
        "A member {$verb} a {$typeLabel} that needs your review.",
        $detail
    );
}

function ww_admin_alert_pending_store(PDO $pdo, int $storeId, string $storeName, int $userId, bool $resubmitted = false): void
{
    if ($storeId <= 0) {
        return;
    }
    $member = ww_admin_user_display_name($pdo, $userId);
    $verb = $resubmitted ? 'resubmitted' : 'submitted';
    $title = ($resubmitted ? 'Store resubmitted: ' : 'New store: ') . mb_substr($storeName, 0, 120);
    $body = 'Online store from ' . $member . ' — pending approval';
    $detail = '<strong>Store</strong><br>'
        . htmlspecialchars($storeName, ENT_QUOTES, 'UTF-8') . '<br><br>'
        . 'Member: ' . htmlspecialchars($member, ENT_QUOTES, 'UTF-8');
    ww_admin_submission_alert(
        $pdo,
        'pending_store',
        $title,
        $body,
        'store.php?id=' . $storeId,
        $storeId,
        $resubmitted ? 'Store resubmitted for review' : 'New storefront awaiting approval',
        "A member {$verb} an online store that needs your review.",
        $detail
    );
}

function ww_admin_alert_pending_directory(
    PDO $pdo,
    int $entryId,
    string $businessName,
    int $userId,
    bool $resubmitted = false
): void {
    if ($entryId <= 0) {
        return;
    }
    $member = ww_admin_user_display_name($pdo, $userId);
    $verb = $resubmitted ? 'resubmitted' : 'submitted';
    $title = ($resubmitted ? 'Business resubmitted: ' : 'New business: ') . mb_substr($businessName, 0, 120);
    $body = 'Directory entry from ' . $member . ' — pending approval';
    $detail = '<strong>Business directory</strong><br>'
        . htmlspecialchars($businessName, ENT_QUOTES, 'UTF-8') . '<br><br>'
        . 'Member: ' . htmlspecialchars($member, ENT_QUOTES, 'UTF-8');
    ww_admin_submission_alert(
        $pdo,
        'pending_directory',
        $title,
        $body,
        'directory_entry.php?id=' . $entryId,
        $entryId,
        $resubmitted ? 'Business listing resubmitted' : 'New business directory entry',
        "A member {$verb} a business listing that needs your review.",
        $detail
    );
}

function ww_admin_alert_pending_product(
    PDO $pdo,
    int $productId,
    string $productName,
    int $userId,
    bool $resubmitted = false
): void {
    if ($productId <= 0) {
        return;
    }
    $member = ww_admin_user_display_name($pdo, $userId);
    $verb = $resubmitted ? 'resubmitted' : 'submitted';
    $title = ($resubmitted ? 'Product resubmitted: ' : 'New product: ') . mb_substr($productName, 0, 120);
    $body = 'Store product from ' . $member . ' — pending approval';
    $detail = '<strong>Store product</strong><br>'
        . htmlspecialchars($productName, ENT_QUOTES, 'UTF-8') . '<br><br>'
        . 'Member: ' . htmlspecialchars($member, ENT_QUOTES, 'UTF-8');
    ww_admin_submission_alert(
        $pdo,
        'pending_product',
        $title,
        $body,
        'store_product.php?id=' . $productId,
        $productId,
        $resubmitted ? 'Product resubmitted for review' : 'New store product awaiting approval',
        "A member {$verb} a store product that needs your review.",
        $detail
    );
}

function ww_admin_alert_pending_user_verification(PDO $pdo, int $userId): void
{
    if ($userId <= 0) {
        return;
    }
    $member = ww_admin_user_display_name($pdo, $userId);
    $title = 'New signup pending verification: ' . mb_substr($member, 0, 120);
    $body = 'Review registration details and approve or decline';
    $detail = 'Member <strong>' . htmlspecialchars($member, ENT_QUOTES, 'UTF-8') . '</strong> completed email verification and is waiting for account approval.';
    ww_admin_submission_alert(
        $pdo,
        'pending_user',
        $title,
        $body,
        'user.php?id=' . $userId,
        $userId,
        'New member awaiting verification',
        'A new member signed up and needs account verification in the admin panel.',
        $detail
    );
}

function ww_admin_alert_content_report(
    PDO $pdo,
    int $reportId,
    string $subjectType,
    int $subjectId,
    string $reasonPreview
): void {
    if ($reportId <= 0) {
        return;
    }
    $typeLabel = str_replace('_', ' ', $subjectType);
    $preview = mb_substr(trim($reasonPreview), 0, 200);
    $title = 'Content report: ' . $typeLabel;
    $body = $preview !== '' ? $preview : 'New report submitted';
    $detail = '<strong>Reported:</strong> ' . htmlspecialchars($typeLabel, ENT_QUOTES, 'UTF-8')
        . ' #' . $subjectId . '<br><br>'
        . htmlspecialchars($preview, ENT_QUOTES, 'UTF-8');
    ww_admin_submission_alert(
        $pdo,
        'content_report',
        $title,
        $body,
        'moderation.php',
        $reportId,
        'New content report',
        'A member reported content that may need moderation.',
        $detail
    );
}

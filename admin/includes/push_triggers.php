<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/api/lib/push_notify.php';
require_once __DIR__ . '/settings_store.php';

function ww_admin_onboarding_app_url(PDO $pdo): string
{
    $custom = trim((string) (ww_get_setting($pdo, 'onboarding_app_url', '') ?? ''));
    if ($custom !== '') {
        return $custom;
    }
    if (defined('WW_PUBLIC_BASE') && WW_PUBLIC_BASE !== '') {
        return rtrim((string) WW_PUBLIC_BASE, '/') . '/download/';
    }
    return 'https://witnessworldconnect.com/download/';
}

function ww_admin_send_account_approved_email(PDO $pdo, int $userId): bool
{
    $st = $pdo->prepare('SELECT email, first_name, last_name FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        return false;
    }
    $email = trim((string) ($user['email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $root = dirname(__DIR__, 2);
    require_once $root . '/api/lib/EmailTemplates.php';
    require_once $root . '/api/lib/Mailer.php';
    if (!defined('WW_EMAIL_LOGO_URL')) {
        $cfg = $root . '/api/config.php';
        if (is_file($cfg)) {
            require_once $cfg;
        }
    }

    $first = trim((string) ($user['first_name'] ?? ''));
    $last = trim((string) ($user['last_name'] ?? ''));
    $name = trim($first . ' ' . $last);
    $support = trim((string) (ww_get_setting($pdo, 'support_email', 'support@witnessworldconnect.com') ?? ''));
    if ($support === '') {
        $support = 'support@witnessworldconnect.com';
    }
    $appUrl = ww_admin_onboarding_app_url($pdo);
    $tutorial = trim((string) (ww_get_setting($pdo, 'onboarding_tutorial_url', '') ?? ''));
    $logo = (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;

    $tpl = EmailTemplates::accountApprovedOnboarding(
        $first !== '' ? $first : 'there',
        $appUrl,
        $support,
        $tutorial !== '' ? $tutorial : null,
        $logo
    );
    $mailer = new Mailer($pdo);
    $subject = "You're in — here's how to make the most of WWC 🌟";

    return $mailer->send($email, $name !== '' ? $name : $email, $subject, $tpl['html'], $tpl['text']);
}

function ww_admin_send_week1_onboarding_email(PDO $pdo, int $userId): bool
{
    $st = $pdo->prepare('SELECT email, first_name, last_name FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user) {
        return false;
    }
    $email = trim((string) ($user['email'] ?? ''));
    if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }

    $root = dirname(__DIR__, 2);
    require_once $root . '/api/lib/EmailTemplates.php';
    require_once $root . '/api/lib/Mailer.php';
    if (!defined('WW_EMAIL_LOGO_URL')) {
        $cfg = $root . '/api/config.php';
        if (is_file($cfg)) {
            require_once $cfg;
        }
    }

    $first = trim((string) ($user['first_name'] ?? ''));
    $last = trim((string) ($user['last_name'] ?? ''));
    $name = trim($first . ' ' . $last);
    $support = trim((string) (ww_get_setting($pdo, 'support_email', 'support@witnessworldconnect.com') ?? ''));
    if ($support === '') {
        $support = 'support@witnessworldconnect.com';
    }
    $logo = (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;

    $tpl = EmailTemplates::accountWeekOneOnboarding(
        $first !== '' ? $first : 'there',
        $support,
        $logo
    );
    $mailer = new Mailer($pdo);
    $subject = 'Your first week on WWC — here is how to get started';

    return $mailer->send($email, $name !== '' ? $name : $email, $subject, $tpl['html'], $tpl['text']);
}

/**
 * Send day-7 onboarding emails that are due. Returns stats.
 *
 * @return array{ok: bool, due: int, sent: int, failed: int, error?: string}
 */
function ww_admin_process_week1_onboarding_emails(PDO $pdo, int $limit = 50): array
{
    $limit = max(1, min(200, $limit));
    try {
        $st = $pdo->prepare(
            'SELECT id FROM users
             WHERE status = ?
               AND account_approved_at IS NOT NULL
               AND onboarding_week1_email_sent_at IS NULL
               AND account_approved_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
             ORDER BY account_approved_at ASC
             LIMIT ' . (int) $limit
        );
        $st->execute(['verified']);
        $ids = array_map(static fn ($r) => (int) $r['id'], $st->fetchAll(PDO::FETCH_ASSOC));
    } catch (Throwable $e) {
        return ['ok' => false, 'due' => 0, 'sent' => 0, 'failed' => 0, 'error' => $e->getMessage()];
    }

    $sent = 0;
    $failed = 0;
    foreach ($ids as $userId) {
        try {
            $ok = ww_admin_send_week1_onboarding_email($pdo, $userId);
            if ($ok) {
                $pdo->prepare(
                    'UPDATE users SET onboarding_week1_email_sent_at = NOW()
                     WHERE id = ? AND onboarding_week1_email_sent_at IS NULL'
                )->execute([$userId]);
                $sent++;
            } else {
                $failed++;
            }
        } catch (Throwable $e) {
            error_log('[WitnessWorld] Week-1 email failed for user ' . $userId . ': ' . $e->getMessage());
            $failed++;
        }
    }

    return ['ok' => true, 'due' => count($ids), 'sent' => $sent, 'failed' => $failed];
}

function ww_admin_notify_account_review(PDO $pdo, int $userId, string $action): void
{
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Account approved',
            'Your Witness World account is verified. Welcome!',
            ['type' => 'account', 'status' => 'verified']
        );
        try {
            ww_admin_send_account_approved_email($pdo, $userId);
        } catch (Throwable $e) {
            error_log('[WitnessWorld] Onboarding email failed for user ' . $userId . ': ' . $e->getMessage());
        }
    } elseif ($action === 'decline') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Account update',
            'Your registration was not approved. Open the app for details.',
            ['type' => 'account', 'status' => 'declined']
        );
    }
}

function ww_admin_notify_listing_review(
    PDO $pdo,
    int $userId,
    string $action,
    string $listingType,
    string $title,
    ?int $listingId = null
): void {
    if ($userId <= 0) {
        return;
    }
    $label = match ($listingType) {
        'classified' => 'Marketplace listing',
        'community' => 'Classifieds post',
        'service' => 'Professional service',
        default => 'Listing',
    };
    $name = $title !== '' ? $title : 'Your listing';
    $data = ['type' => 'listing', 'listing_type' => $listingType, 'status' => $action === 'approve' ? 'approved' : 'rejected'];
    if ($listingId !== null && $listingId > 0) {
        $data['listing_id'] = $listingId;
    }
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            $label . ' approved',
            $name . ' is now live on the marketplace.',
            $data
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            $label . ' declined',
            $name . ' was not approved. Open the app for details.',
            $data
        );
    }
}

function ww_admin_notify_store_review(PDO $pdo, int $userId, string $action, string $storeName, ?int $storeId = null): void
{
    $name = $storeName !== '' ? $storeName : 'Your store';
    $data = ['type' => 'store', 'status' => $action === 'approve' ? 'approved' : 'rejected'];
    if ($storeId !== null && $storeId > 0) {
        $data['store_id'] = $storeId;
    }
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Store approved',
            $name . ' is now live.',
            $data
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Store declined',
            $name . ' was not approved. Open the app for details.',
            $data
        );
    }
}

function ww_admin_notify_directory_review(
    PDO $pdo,
    int $userId,
    string $action,
    string $businessName,
    ?int $entryId = null
): void {
    $name = $businessName !== '' ? $businessName : 'Your directory listing';
    $data = ['type' => 'directory_entry', 'status' => $action === 'approve' ? 'approved' : 'rejected'];
    if ($entryId !== null && $entryId > 0) {
        $data['entry_id'] = $entryId;
    }
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Directory listing approved',
            $name . ' is now in the business directory.',
            $data
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Directory listing declined',
            $name . ' was not approved. Open the app for details.',
            $data
        );
    }
}

function ww_admin_notify_product_review(
    PDO $pdo,
    int $ownerUserId,
    string $action,
    string $productName,
    ?int $productId = null
): void {
    $name = $productName !== '' ? $productName : 'Your product';
    $data = ['type' => 'product', 'status' => $action === 'approve' ? 'approved' : 'rejected'];
    if ($productId !== null && $productId > 0) {
        $data['product_id'] = $productId;
    }
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $ownerUserId,
            'Product approved',
            $name . ' is now visible in your store.',
            $data
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $ownerUserId,
            'Product declined',
            $name . ' was not approved. Open the app for details.',
            $data
        );
    }
}

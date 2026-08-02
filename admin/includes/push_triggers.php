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
    string $title
): void {
    $kind = $listingType === 'classified' ? 'classified' : 'service';
    $label = $kind === 'classified' ? 'Classified' : 'Service listing';
    $name = $title !== '' ? $title : 'Your listing';
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            $label . ' approved',
            $name . ' is now live on the marketplace.',
            ['type' => 'listing', 'listing_type' => $listingType, 'status' => 'approved']
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            $label . ' declined',
            $name . ' was not approved. Open the app for details.',
            ['type' => 'listing', 'listing_type' => $listingType, 'status' => 'rejected']
        );
    }
}

function ww_admin_notify_store_review(PDO $pdo, int $userId, string $action, string $storeName): void
{
    $name = $storeName !== '' ? $storeName : 'Your store';
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Store approved',
            $name . ' is now live.',
            ['type' => 'store', 'status' => 'approved']
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Store declined',
            $name . ' was not approved. Open the app for details.',
            ['type' => 'store', 'status' => 'rejected']
        );
    }
}

function ww_admin_notify_directory_review(PDO $pdo, int $userId, string $action, string $businessName): void
{
    $name = $businessName !== '' ? $businessName : 'Your directory listing';
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Directory listing approved',
            $name . ' is now in the business directory.',
            ['type' => 'directory_entry', 'status' => 'approved']
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $userId,
            'Directory listing declined',
            $name . ' was not approved. Open the app for details.',
            ['type' => 'directory_entry', 'status' => 'rejected']
        );
    }
}

function ww_admin_notify_product_review(PDO $pdo, int $ownerUserId, string $action, string $productName): void
{
    $name = $productName !== '' ? $productName : 'Your product';
    if ($action === 'approve') {
        ww_push_to_user(
            $pdo,
            $ownerUserId,
            'Product approved',
            $name . ' is now visible in your store.',
            ['type' => 'product', 'status' => 'approved']
        );
    } elseif ($action === 'reject') {
        ww_push_to_user(
            $pdo,
            $ownerUserId,
            'Product declined',
            $name . ' was not approved. Open the app for details.',
            ['type' => 'product', 'status' => 'rejected']
        );
    }
}

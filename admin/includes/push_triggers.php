<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/api/lib/push_notify.php';

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

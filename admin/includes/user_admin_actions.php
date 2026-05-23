<?php

declare(strict_types=1);

require_once __DIR__ . '/settings_store.php';
require_once __DIR__ . '/push_triggers.php';

function ww_admin_support_user_id(PDO $pdo): int
{
    return (int) (ww_get_setting($pdo, 'support_user_id', '0') ?? 0);
}

function ww_admin_user_is_protected(PDO $pdo, int $userId): bool
{
    $supportId = ww_admin_support_user_id($pdo);

    return $supportId > 0 && $supportId === $userId;
}

function ww_admin_can_suspend_user(array $user): bool
{
    $status = (string) ($user['status'] ?? '');

    return in_array($status, ['verified', 'declined'], true);
}

function ww_admin_can_delete_user(PDO $pdo, array $user): bool
{
    return !ww_admin_user_is_protected($pdo, (int) ($user['id'] ?? 0));
}

function ww_admin_revoke_user_tokens(PDO $pdo, int $userId): void
{
    try {
        $pdo->prepare('DELETE FROM user_api_tokens WHERE user_id = ?')->execute([$userId]);
    } catch (Throwable) {
        /* table may be missing in old DBs */
    }
}

function ww_admin_suspend_user(PDO $pdo, int $userId): bool
{
    $st = $pdo->prepare('SELECT id, status, first_name FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || !ww_admin_can_suspend_user($row)) {
        return false;
    }

    $pdo->prepare("UPDATE users SET status = 'pending_verification' WHERE id = ?")->execute([$userId]);
    ww_admin_revoke_user_tokens($pdo, $userId);

    ww_push_to_user(
        $pdo,
        $userId,
        'Account update',
        'Your account requires verification before you can continue using Witness World Connect.',
        ['type' => 'account', 'status' => 'pending_verification']
    );

    return true;
}

function ww_admin_delete_user(PDO $pdo, int $userId): bool
{
    if (ww_admin_user_is_protected($pdo, $userId)) {
        return false;
    }

    $st = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    if (!$st->fetchColumn()) {
        return false;
    }

    ww_admin_revoke_user_tokens($pdo, $userId);
    $pdo->prepare('DELETE FROM users WHERE id = ?')->execute([$userId]);

    return true;
}

<?php

declare(strict_types=1);

require_once __DIR__ . '/push_triggers.php';

/**
 * @return array<string, array<string, mixed>>|null
 */
function ww_content_entity_config(string $type): ?array
{
    static $cfg = [
        'listing' => [
            'table' => 'listings',
            'handler' => 'listing.php',
            'list' => 'listings.php',
            'label_field' => 'title',
            'owner_field' => 'user_id',
            'suspend_to' => 'pending_approval',
            'suspend_from' => ['approved', 'rejected'],
            'type_label' => 'listing',
        ],
        'store' => [
            'table' => 'stores',
            'handler' => 'store.php',
            'list' => 'stores.php',
            'label_field' => 'name',
            'owner_field' => 'user_id',
            'suspend_to' => 'suspended',
            'suspend_from' => ['approved', 'rejected'],
            'type_label' => 'store',
        ],
        'product' => [
            'table' => 'store_products',
            'handler' => 'store_product.php',
            'list' => 'store_products.php',
            'label_field' => 'name',
            'owner_sql' => 'SELECT s.user_id FROM store_products p INNER JOIN stores s ON s.id = p.store_id WHERE p.id = ? LIMIT 1',
            'suspend_to' => 'pending_approval',
            'suspend_from' => ['approved', 'rejected'],
            'type_label' => 'product',
        ],
        'directory' => [
            'table' => 'directory_entries',
            'handler' => 'directory_entry.php',
            'list' => 'directory.php',
            'label_field' => 'business_name',
            'owner_field' => 'user_id',
            'suspend_to' => 'suspended',
            'suspend_from' => ['approved', 'rejected'],
            'type_label' => 'directory listing',
        ],
    ];

    return $cfg[$type] ?? null;
}

function ww_content_handler_url(string $type, int $id, string $base = ''): string
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return '#';
    }
    $handler = (string) $cfg['handler'];
    if ($base !== '' && $base !== '.') {
        $handler = $base . '/' . $handler;
    }

    return $handler . '?id=' . $id;
}

function ww_content_list_url(string $type, string $base = '', ?string $contentTab = null): string
{
    if (!function_exists('ww_admin_content_url')) {
        require_once __DIR__ . '/admin_hub_config.php';
    }
    $tab = $contentTab !== null && $contentTab !== ''
        ? ww_admin_content_tab_resolve($contentTab)
        : ww_admin_content_tab_for_entity($type);

    return ww_admin_content_url($tab, $base);
}

function ww_content_resolve_list_url(string $type, int $id, string $returnTo, string $base = ''): string
{
    if (!function_exists('ww_admin_content_url')) {
        require_once __DIR__ . '/admin_hub_config.php';
    }
    if (str_starts_with($returnTo, 'list:')) {
        return ww_admin_content_url(substr($returnTo, 5), $base);
    }
    if ($returnTo !== 'list') {
        return ww_content_handler_url($type, $id, $base);
    }
    $tab = ww_admin_content_tab_for_entity($type);
    if ($type === 'listing') {
        try {
            $st = witnessworld_pdo()->prepare('SELECT listing_type FROM listings WHERE id = ? LIMIT 1');
            $st->execute([$id]);
            $lt = $st->fetchColumn();
            if (is_string($lt) && $lt !== '') {
                $tab = ww_admin_content_tab_for_entity('listing', $lt);
            }
        } catch (Throwable) {
            // use default tab
        }
    }

    return ww_admin_content_url($tab, $base);
}

function ww_content_row_label(array $row, string $type): string
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return 'this item';
    }
    $field = (string) $cfg['label_field'];
    $label = trim((string) ($row[$field] ?? ''));

    return $label !== '' ? $label : 'this ' . (string) $cfg['type_label'];
}

function ww_content_can_suspend(string $type, string $status): bool
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return false;
    }

    return in_array($status, (array) $cfg['suspend_from'], true);
}

function ww_content_can_delete(string $type): bool
{
    return ww_content_entity_config($type) !== null;
}

function ww_content_owner_user_id(PDO $pdo, string $type, int $id): int
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return 0;
    }
    if (isset($cfg['owner_sql'])) {
        $st = $pdo->prepare((string) $cfg['owner_sql']);
        $st->execute([$id]);

        return (int) $st->fetchColumn();
    }
    $table = (string) $cfg['table'];
    $field = (string) $cfg['owner_field'];
    $st = $pdo->prepare("SELECT {$field} FROM {$table} WHERE id = ? LIMIT 1");
    $st->execute([$id]);

    return (int) $st->fetchColumn();
}

function ww_content_notify_suspended(PDO $pdo, string $type, int $ownerId, string $label): void
{
    if ($ownerId <= 0) {
        return;
    }
    $cfg = ww_content_entity_config($type);
    $kind = $cfg ? (string) $cfg['type_label'] : 'listing';
    ww_push_to_user(
        $pdo,
        $ownerId,
        ucfirst($kind) . ' update',
        $label . ' is no longer visible and needs admin review before it can go live again.',
        ['type' => $type, 'status' => 'suspended']
    );
}

function ww_content_suspend(PDO $pdo, string $type, int $id, int $adminId, ?string $note = null): bool
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return false;
    }
    $table = (string) $cfg['table'];
    $st = $pdo->prepare("SELECT id, moderation_status, {$cfg['label_field']} AS lbl FROM {$table} WHERE id = ? LIMIT 1");
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || !ww_content_can_suspend($type, (string) $row['moderation_status'])) {
        return false;
    }

    $now = date('Y-m-d H:i:s');
    $to = (string) $cfg['suspend_to'];
    $pdo->prepare(
        "UPDATE {$table} SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?"
    )->execute([
        $to,
        $note !== null && $note !== '' ? $note : null,
        $now,
        $adminId > 0 ? $adminId : null,
        $id,
    ]);

    $ownerId = ww_content_owner_user_id($pdo, $type, $id);
    ww_content_notify_suspended($pdo, $type, $ownerId, (string) ($row['lbl'] ?? 'Your item'));

    return true;
}

function ww_content_delete(PDO $pdo, string $type, int $id): bool
{
    $cfg = ww_content_entity_config($type);
    if (!$cfg) {
        return false;
    }
    $table = (string) $cfg['table'];
    $st = $pdo->prepare("SELECT id FROM {$table} WHERE id = ? LIMIT 1");
    $st->execute([$id]);
    if (!$st->fetchColumn()) {
        return false;
    }
    $pdo->prepare("DELETE FROM {$table} WHERE id = ?")->execute([$id]);

    return true;
}

function ww_content_redirect_after_action(string $type, int $id, string $action, string $returnTo, string $base = ''): void
{
    if ($action === 'delete') {
        header('Location: ' . ww_content_resolve_list_url($type, $id, $returnTo, $base) . '?deleted=1');
        exit;
    }
    if ($returnTo === 'list' || str_starts_with($returnTo, 'list:')) {
        $list = ww_content_resolve_list_url($type, $id, $returnTo, $base);
        $qs = $action === 'suspend' ? '?suspended=1' : '?moderated=1';
        header('Location: ' . $list . $qs);
        exit;
    }
    header('Location: ' . ww_content_handler_url($type, $id, $base));
    exit;
}

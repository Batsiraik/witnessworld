<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/../admin/includes/settings_store.php';

function ww_support_user_id(PDO $pdo): int
{
    $v = ww_get_setting($pdo, 'support_user_id', '0') ?? '0';

    return max(0, (int) $v);
}

/** @param array<string, mixed>|false $row */
function ww_is_support_context($row): bool
{
    if (!is_array($row)) {
        return false;
    }

    return strtolower(trim((string) ($row['context_key'] ?? ''))) === 'support';
}

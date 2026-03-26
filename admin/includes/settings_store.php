<?php

declare(strict_types=1);

/**
 * Key/value app settings (support email, SMTP, etc.)
 *
 * @param PDO $pdo
 */
function ww_get_setting(PDO $pdo, string $key, ?string $default = null): ?string
{
    $st = $pdo->prepare('SELECT `value` FROM settings WHERE `key` = ? LIMIT 1');
    $st->execute([$key]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        return $default;
    }
    return $row['value'];
}

function ww_set_setting(PDO $pdo, string $key, string $value): void
{
    $st = $pdo->prepare('INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)');
    $st->execute([$key, $value]);
}

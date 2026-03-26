<?php

declare(strict_types=1);

function ww_issue_user_token(PDO $pdo, int $userId): string
{
    $token = bin2hex(random_bytes(32));
    $days = defined('WW_TOKEN_DAYS') ? (int) WW_TOKEN_DAYS : 30;
    $expires = (new DateTimeImmutable())->modify('+' . $days . ' days')->format('Y-m-d H:i:s');
    $pdo->prepare('DELETE FROM user_api_tokens WHERE user_id = ?')->execute([$userId]);
    $ins = $pdo->prepare('INSERT INTO user_api_tokens (user_id, token, expires_at) VALUES (?,?,?)');
    $ins->execute([$userId, $token, $expires]);
    return $token;
}

function ww_invalidate_user_tokens(PDO $pdo, int $userId): void
{
    $pdo->prepare('DELETE FROM user_api_tokens WHERE user_id = ?')->execute([$userId]);
}

/**
 * @return array<string, mixed>|null
 */
function ww_user_from_token(PDO $pdo, string $token): ?array
{
    $st = $pdo->prepare(
        'SELECT u.* FROM users u
         INNER JOIN user_api_tokens t ON t.user_id = u.id
         WHERE t.token = ? AND t.expires_at > NOW() LIMIT 1'
    );
    $st->execute([$token]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function ww_user_public(array $row): array
{
    foreach (['password_hash', 'registration_otp', 'password_reset_otp', 'password_reset_token'] as $k) {
        unset($row[$k]);
    }
    return $row;
}

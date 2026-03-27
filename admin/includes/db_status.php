<?php

/**
 * @return array{ok: bool, message: string}
 */
function witnessworld_db_status(): array
{
    try {
        require_once __DIR__ . '/conn.php';
        witnessworld_pdo()->query('SELECT 1');
        return ['ok' => true, 'message' => 'Connected to database.'];
    } catch (Throwable $e) {
        return [
            'ok' => false,
            'message' => 'Could not connect. Check config.local.php and Hostinger Remote MySQL IP allowlist.',
        ];
    }
}

<?php

declare(strict_types=1);

/**
 * One-shot: add admins password_reset_otp columns.
 * Run: php database/migrate_admin_password_reset.php
 */

require_once dirname(__DIR__) . '/admin/includes/conn.php';

$pdo = witnessworld_pdo();

try {
    $cols = $pdo->query("SHOW COLUMNS FROM admins LIKE 'password_reset_otp'")->fetchAll();
    if ($cols) {
        echo "OK: password_reset_otp already exists.\n";
        exit(0);
    }
    $pdo->exec(
        'ALTER TABLE admins
           ADD COLUMN password_reset_otp VARCHAR(6) NULL AFTER login_otp_expires_at,
           ADD COLUMN password_reset_expires_at DATETIME NULL AFTER password_reset_otp'
    );
    echo "OK: added admin password reset columns.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}

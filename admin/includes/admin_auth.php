<?php

declare(strict_types=1);

require_once __DIR__ . '/conn.php';

if (session_status() === PHP_SESSION_NONE) {
    $lifetime = 30 * 24 * 60 * 60;
    ini_set('session.gc_maxlifetime', (string) $lifetime);
    session_set_cookie_params([
        'lifetime' => $lifetime,
        'path' => '/',
        'secure' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function ww_admin_require(): void
{
    if (empty($_SESSION['admin_id'])) {
        header('Location: login.php');
        exit;
    }
}

/**
 * @return array{id:int,username:string,name:string,is_super:bool,email:string}
 */
function ww_admin_user(): array
{
    return [
        'id' => (int) ($_SESSION['admin_id'] ?? 0),
        'username' => (string) ($_SESSION['admin_username'] ?? ''),
        'name' => (string) ($_SESSION['admin_name'] ?? ''),
        'email' => (string) ($_SESSION['admin_email'] ?? ''),
        'is_super' => !empty($_SESSION['admin_super']),
    ];
}

function ww_admin_require_super(): void
{
    ww_admin_require();
    if (!ww_admin_user()['is_super']) {
        http_response_code(403);
        echo 'Forbidden';
        exit;
    }
}

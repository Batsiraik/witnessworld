<?php

declare(strict_types=1);

const WW_ADMIN_DEVICE_COOKIE = 'ww_admin_device';
const WW_ADMIN_DEVICE_TRUST_DAYS = 7;
const WW_ADMIN_OTP_MINUTES = 15;

function ww_admin_project_root(): string
{
    return dirname(__DIR__, 2);
}

function ww_admin_bootstrap_mailer(): void
{
    static $ready = false;
    if ($ready) {
        return;
    }
    $root = ww_admin_project_root();
    $autoload = $root . '/vendor/autoload.php';
    if (!is_file($autoload)) {
        throw new RuntimeException('Missing vendor/autoload.php — run composer install on the server.');
    }
    require_once $autoload;
    if (!defined('WW_PUBLIC_BASE')) {
        require_once $root . '/api/config.php';
    }
    require_once $root . '/api/lib/EmailTemplates.php';
    require_once $root . '/api/lib/Mailer.php';
    $ready = true;
}

function ww_admin_email_logo_url(): ?string
{
    if (!defined('WW_EMAIL_LOGO_URL')) {
        $cfg = ww_admin_project_root() . '/api/config.php';
        if (is_file($cfg)) {
            require_once $cfg;
        }
    }
    return (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;
}

function ww_admin_public_login_url(): string
{
    if (defined('WW_PUBLIC_BASE') && WW_PUBLIC_BASE !== '') {
        return rtrim((string) WW_PUBLIC_BASE, '/') . '/admin/login.php';
    }
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $scriptDir = str_replace('\\', '/', dirname((string) ($_SERVER['SCRIPT_NAME'] ?? '/admin')));
    $len = strlen($scriptDir);
    if ($len < 6 || substr($scriptDir, -6) !== '/admin') {
        $scriptDir = rtrim($scriptDir, '/') . '/admin';
    }
    return $scheme . '://' . $host . $scriptDir . '/login.php';
}

function ww_admin_generate_password(int $length = 16): string
{
    $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    $lower = 'abcdefghjkmnpqrstuvwxyz';
    $digits = '23456789';
    $symbols = '!@#$%&*?';
    $all = $upper . $lower . $digits . $symbols;
    $pick = static function (string $pool): string {
        return $pool[random_int(0, strlen($pool) - 1)];
    };
    $chars = [$pick($upper), $pick($lower), $pick($digits), $pick($symbols)];
    for ($i = count($chars); $i < $length; $i++) {
        $chars[] = $pick($all);
    }
    shuffle($chars);
    return implode('', $chars);
}

function ww_admin_unique_username(PDO $pdo, string $email): string
{
    $local = strtolower((string) preg_replace('/@.*$/', '', $email));
    $base = (string) preg_replace('/[^a-z0-9_]/', '', $local);
    if ($base === '') {
        $base = 'admin';
    }
    if (strlen($base) > 48) {
        $base = substr($base, 0, 48);
    }
    $candidate = $base;
    $st = $pdo->prepare('SELECT id FROM admins WHERE username = ? LIMIT 1');
    for ($i = 0; $i < 50; $i++) {
        $st->execute([$candidate]);
        if (!$st->fetch()) {
            return $candidate;
        }
        $candidate = $base . random_int(1000, 9999);
    }
    return $base . bin2hex(random_bytes(3));
}

function ww_admin_user_agent_hash(): string
{
    return hash('sha256', (string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
}

function ww_admin_device_cookie_value(): ?string
{
    return isset($_COOKIE[WW_ADMIN_DEVICE_COOKIE]) ? (string) $_COOKIE[WW_ADMIN_DEVICE_COOKIE] : null;
}

/**
 * @return array<string, mixed>|null
 */
function ww_admin_trusted_devices_ready(PDO $pdo): bool
{
    static $ready = null;
    if ($ready !== null) {
        return $ready;
    }
    try {
        $pdo->query('SELECT 1 FROM admin_trusted_devices LIMIT 1');
        $ready = true;
    } catch (Throwable) {
        $ready = false;
    }
    return $ready;
}

/**
 * @return array<string, mixed>|null
 */
function ww_admin_find_trusted_device(PDO $pdo, int $adminId, string $token): ?array
{
    if (!ww_admin_trusted_devices_ready($pdo)) {
        return null;
    }
    $hash = hash('sha256', $token);
    $st = $pdo->prepare(
        'SELECT * FROM admin_trusted_devices
         WHERE admin_id = ? AND token_hash = ? AND user_agent_hash = ?
         LIMIT 1'
    );
    $st->execute([$adminId, $hash, ww_admin_user_agent_hash()]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function ww_admin_device_is_active(array $device): bool
{
    $last = strtotime((string) ($device['last_seen_at'] ?? ''));
    if ($last === false) {
        return false;
    }
    return $last >= strtotime('-' . WW_ADMIN_DEVICE_TRUST_DAYS . ' days');
}

function ww_admin_set_device_cookie(string $token): void
{
    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    setcookie(WW_ADMIN_DEVICE_COOKIE, $token, [
        'expires' => time() + (WW_ADMIN_DEVICE_TRUST_DAYS * 86400),
        'path' => '/',
        'secure' => $secure,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    $_COOKIE[WW_ADMIN_DEVICE_COOKIE] = $token;
}

function ww_admin_create_trusted_device(PDO $pdo, int $adminId): void
{
    if (!ww_admin_trusted_devices_ready($pdo)) {
        return;
    }
    $token = bin2hex(random_bytes(32));
    $hash = hash('sha256', $token);
    $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $pdo->prepare(
        'INSERT INTO admin_trusted_devices (admin_id, token_hash, user_agent_hash, last_seen_at) VALUES (?,?,?,?)'
    )->execute([$adminId, $hash, ww_admin_user_agent_hash(), $now]);
    ww_admin_set_device_cookie($token);
}

function ww_admin_touch_trusted_device(PDO $pdo, int $adminId): void
{
    $token = ww_admin_device_cookie_value();
    if ($token === null || $token === '') {
        return;
    }
    $device = ww_admin_find_trusted_device($pdo, $adminId, $token);
    if ($device === null || !ww_admin_device_is_active($device)) {
        return;
    }
    $now = (new DateTimeImmutable())->format('Y-m-d H:i:s');
    $pdo->prepare('UPDATE admin_trusted_devices SET last_seen_at = ? WHERE id = ?')
        ->execute([$now, (int) $device['id']]);
    ww_admin_set_device_cookie($token);
}

function ww_admin_has_trusted_device(PDO $pdo, int $adminId): bool
{
    $token = ww_admin_device_cookie_value();
    if ($token === null || $token === '') {
        return false;
    }
    $device = ww_admin_find_trusted_device($pdo, $adminId, $token);
    return $device !== null && ww_admin_device_is_active($device);
}

function ww_admin_issue_login_otp(PDO $pdo, int $adminId): string
{
    $otp = (string) random_int(100000, 999999);
    $exp = (new DateTimeImmutable())->modify('+' . WW_ADMIN_OTP_MINUTES . ' minutes')->format('Y-m-d H:i:s');
    try {
        $pdo->prepare('UPDATE admins SET login_otp = ?, login_otp_expires_at = ? WHERE id = ?')
            ->execute([$otp, $exp, $adminId]);
    } catch (Throwable) {
        // login_otp columns not migrated yet — OTP still returned for session step.
    }
    return $otp;
}

function ww_admin_clear_login_otp(PDO $pdo, int $adminId): void
{
    $pdo->prepare('UPDATE admins SET login_otp = NULL, login_otp_expires_at = NULL WHERE id = ?')
        ->execute([$adminId]);
}

function ww_admin_send_login_otp_email(PDO $pdo, array $admin, string $otp): bool
{
    ww_admin_bootstrap_mailer();
    $mailer = new Mailer($pdo);
    $name = trim((string) ($admin['name'] ?? 'Admin'));
    $tpl = EmailTemplates::adminLoginOtp($name, $otp, ww_admin_email_logo_url());
    return $mailer->send(
        (string) $admin['email'],
        $name,
        'Your Witness World Connect admin sign-in code',
        $tpl['html'],
        $tpl['text']
    );
}

function ww_admin_send_welcome_email(PDO $pdo, array $admin, string $username, string $plainPassword): bool
{
    ww_admin_bootstrap_mailer();
    $mailer = new Mailer($pdo);
    $name = trim((string) ($admin['name'] ?? 'Admin'));
    $loginUrl = ww_admin_public_login_url();
    $tpl = EmailTemplates::adminWelcomeCredentials($name, $username, $plainPassword, $loginUrl, ww_admin_email_logo_url());
    return $mailer->send(
        (string) $admin['email'],
        $name,
        'You have been added as a Witness World Connect admin',
        $tpl['html'],
        $tpl['text']
    );
}

/**
 * @param array<string, mixed> $row
 */
function ww_admin_establish_session(array $row): void
{
    $_SESSION['admin_id'] = (int) $row['id'];
    $_SESSION['admin_username'] = (string) $row['username'];
    $_SESSION['admin_name'] = (string) $row['name'];
    $_SESSION['admin_email'] = (string) $row['email'];
    $_SESSION['admin_super'] = (bool) $row['is_super_admin'];
    unset(
        $_SESSION['admin_otp_pending_id'],
        $_SESSION['admin_reset_pending_id'],
        $_SESSION['admin_reset_allowed_id']
    );
}

function ww_admin_begin_otp_pending(int $adminId): void
{
    unset($_SESSION['admin_id'], $_SESSION['admin_username'], $_SESSION['admin_name'], $_SESSION['admin_email'], $_SESSION['admin_super']);
    $_SESSION['admin_otp_pending_id'] = $adminId;
}

function ww_admin_verify_login_otp(PDO $pdo, int $adminId, string $code): bool
{
    $st = $pdo->prepare('SELECT login_otp, login_otp_expires_at FROM admins WHERE id = ? LIMIT 1');
    $st->execute([$adminId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || ($row['login_otp'] ?? '') === '') {
        return false;
    }
    $exp = strtotime((string) ($row['login_otp_expires_at'] ?? ''));
    if ($exp === false || $exp < time()) {
        return false;
    }
    return hash_equals((string) $row['login_otp'], preg_replace('/\D/', '', $code));
}

/**
 * After password OK: trusted device → full session; else OTP email + pending.
 *
 * @param array<string, mixed> $row
 * @return 'session'|'otp'
 */
function ww_admin_complete_password_login(PDO $pdo, array $row): string
{
    $adminId = (int) $row['id'];
    if (ww_admin_has_trusted_device($pdo, $adminId)) {
        ww_admin_establish_session($row);
        ww_admin_touch_trusted_device($pdo, $adminId);
        ww_admin_clear_login_otp($pdo, $adminId);
        return 'session';
    }
    $otp = ww_admin_issue_login_otp($pdo, $adminId);
    ww_admin_send_login_otp_email($pdo, $row, $otp);
    ww_admin_begin_otp_pending($adminId);
    return 'otp';
}

/**
 * @param array<string, mixed> $row
 */
function ww_admin_complete_otp_login(PDO $pdo, array $row): void
{
    ww_admin_clear_login_otp($pdo, (int) $row['id']);
    ww_admin_establish_session($row);
    if (!ww_admin_has_trusted_device($pdo, (int) $row['id'])) {
        ww_admin_create_trusted_device($pdo, (int) $row['id']);
    } else {
        ww_admin_touch_trusted_device($pdo, (int) $row['id']);
    }
}

function ww_admin_reset_pending_id(): int
{
    return (int) ($_SESSION['admin_reset_pending_id'] ?? 0);
}

function ww_admin_reset_allowed_id(): int
{
    return (int) ($_SESSION['admin_reset_allowed_id'] ?? 0);
}

function ww_admin_begin_password_reset(int $adminId): void
{
    unset(
        $_SESSION['admin_id'],
        $_SESSION['admin_username'],
        $_SESSION['admin_name'],
        $_SESSION['admin_email'],
        $_SESSION['admin_super'],
        $_SESSION['admin_otp_pending_id'],
        $_SESSION['admin_reset_allowed_id']
    );
    $_SESSION['admin_reset_pending_id'] = $adminId;
}

function ww_admin_clear_password_reset_session(): void
{
    unset($_SESSION['admin_reset_pending_id'], $_SESSION['admin_reset_allowed_id']);
}

function ww_admin_issue_password_reset_otp(PDO $pdo, int $adminId): string
{
    $otp = (string) random_int(100000, 999999);
    $exp = (new DateTimeImmutable())->modify('+' . WW_ADMIN_OTP_MINUTES . ' minutes')->format('Y-m-d H:i:s');
    $pdo->prepare('UPDATE admins SET password_reset_otp = ?, password_reset_expires_at = ? WHERE id = ?')
        ->execute([$otp, $exp, $adminId]);

    return $otp;
}

function ww_admin_clear_password_reset_otp(PDO $pdo, int $adminId): void
{
    try {
        $pdo->prepare('UPDATE admins SET password_reset_otp = NULL, password_reset_expires_at = NULL WHERE id = ?')
            ->execute([$adminId]);
    } catch (Throwable) {
        /* columns may not exist until migration */
    }
}

function ww_admin_send_password_reset_otp_email(PDO $pdo, array $admin, string $otp): bool
{
    ww_admin_bootstrap_mailer();
    $mailer = new Mailer($pdo);
    $name = trim((string) ($admin['name'] ?? 'Admin'));
    $tpl = EmailTemplates::adminPasswordResetOtp($name, $otp, ww_admin_email_logo_url());

    return $mailer->send(
        (string) $admin['email'],
        $name,
        'Your Witness World Connect admin password reset code',
        $tpl['html'],
        $tpl['text']
    );
}

function ww_admin_verify_password_reset_otp(PDO $pdo, int $adminId, string $code): bool
{
    $st = $pdo->prepare('SELECT password_reset_otp, password_reset_expires_at FROM admins WHERE id = ? LIMIT 1');
    $st->execute([$adminId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row || ($row['password_reset_otp'] ?? '') === '') {
        return false;
    }
    $exp = strtotime((string) ($row['password_reset_expires_at'] ?? ''));
    if ($exp === false || $exp < time()) {
        return false;
    }

    return hash_equals((string) $row['password_reset_otp'], preg_replace('/\D/', '', $code) ?? '');
}

function ww_admin_revoke_trusted_devices(PDO $pdo, int $adminId): void
{
    if (!ww_admin_trusted_devices_ready($pdo)) {
        return;
    }
    $pdo->prepare('DELETE FROM admin_trusted_devices WHERE admin_id = ?')->execute([$adminId]);
}

/**
 * Find admin by username or email (case-insensitive email).
 *
 * @return array<string, mixed>|null
 */
function ww_admin_find_by_login(PDO $pdo, string $identifier): ?array
{
    $identifier = trim($identifier);
    if ($identifier === '') {
        return null;
    }

    $st = $pdo->prepare(
        'SELECT * FROM admins WHERE username = ? OR LOWER(email) = ? LIMIT 1'
    );
    $st->execute([$identifier, strtolower($identifier)]);
    $row = $st->fetch(PDO::FETCH_ASSOC);

    return $row ?: null;
}

/**
 * Look up admin by email or username for reset. Always return generic outcome to caller.
 *
 * @return array{ok:bool, sent?:bool, admin?:array<string,mixed>}
 */
function ww_admin_start_password_reset(PDO $pdo, string $identifier): array
{
    $identifier = trim($identifier);
    if ($identifier === '') {
        return ['ok' => true, 'sent' => false];
    }

    $row = ww_admin_find_by_login($pdo, $identifier);
    if (!$row) {
        return ['ok' => true, 'sent' => false];
    }

    $adminId = (int) $row['id'];
    $otp = ww_admin_issue_password_reset_otp($pdo, $adminId);
    $sent = ww_admin_send_password_reset_otp_email($pdo, $row, $otp);
    ww_admin_begin_password_reset($adminId);

    return ['ok' => true, 'sent' => $sent, 'admin' => $row];
}

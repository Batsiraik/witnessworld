<?php

declare(strict_types=1);

require_once __DIR__ . '/Mailer.php';
require_once __DIR__ . '/EmailTemplates.php';

const WW_REGISTRATION_OTP_TTL_MINUTES = 30;
const WW_REGISTRATION_OTP_MIN_RESEND_SECONDS = 45;

function ww_registration_otp_seconds_since_issue(?string $expiresAt): ?int
{
    if ($expiresAt === null || $expiresAt === '') {
        return null;
    }
    $exp = strtotime($expiresAt);
    if ($exp === false) {
        return null;
    }
    $issuedAt = $exp - (WW_REGISTRATION_OTP_TTL_MINUTES * 60);

    return time() - $issuedAt;
}

function ww_registration_otp_resend_wait_seconds(?string $expiresAt): int
{
    $since = ww_registration_otp_seconds_since_issue($expiresAt);
    if ($since === null) {
        return 0;
    }
    $wait = WW_REGISTRATION_OTP_MIN_RESEND_SECONDS - $since;

    return $wait > 0 ? $wait : 0;
}

/**
 * @param array<string, mixed> $user Row with id, email, first_name, last_name, status, registration_otp_expires_at
 * @return array{ok: bool, otp?: string, email_sent?: bool, error?: string, retry_after?: int}
 */
function ww_send_registration_otp(PDO $pdo, array $user, bool $enforceCooldown = true): array
{
    $userId = (int) ($user['id'] ?? 0);
    if ($userId <= 0) {
        return ['ok' => false, 'error' => 'Invalid user'];
    }
    if (($user['status'] ?? '') !== 'pending_otp') {
        return ['ok' => false, 'error' => 'This account is not waiting for email verification'];
    }

    if ($enforceCooldown) {
        $wait = ww_registration_otp_resend_wait_seconds($user['registration_otp_expires_at'] ?? null);
        if ($wait > 0) {
            return [
                'ok' => false,
                'error' => 'Please wait ' . $wait . ' seconds before requesting another code.',
                'retry_after' => $wait,
            ];
        }
    }

    $otp = (string) random_int(100000, 999999);
    $otpExpires = (new DateTimeImmutable())
        ->modify('+' . WW_REGISTRATION_OTP_TTL_MINUTES . ' minutes')
        ->format('Y-m-d H:i:s');

    $pdo->prepare(
        'UPDATE users SET registration_otp = ?, registration_otp_expires_at = ? WHERE id = ? AND status = ?'
    )->execute([$otp, $otpExpires, $userId, 'pending_otp']);

    $email = (string) ($user['email'] ?? '');
    $first = (string) ($user['first_name'] ?? '');
    $last = (string) ($user['last_name'] ?? '');
    $mailer = new Mailer($pdo);
    $subject = 'Your Witness World Connect verification code';
    $logo = (defined('WW_EMAIL_LOGO_URL') && WW_EMAIL_LOGO_URL !== '') ? (string) WW_EMAIL_LOGO_URL : null;
    $tpl = EmailTemplates::registrationOtp($first, $otp, $logo);
    $sent = $mailer->send($email, trim($first . ' ' . $last), $subject, $tpl['html'], $tpl['text']);

    $out = ['ok' => true, 'email_sent' => $sent];
    if (defined('WW_API_DEBUG') && WW_API_DEBUG) {
        $out['otp'] = $otp;
    }

    return $out;
}

function ww_bypass_registration_otp(PDO $pdo, int $userId): bool
{
    $st = $pdo->prepare('SELECT id, status FROM users WHERE id = ? LIMIT 1');
    $st->execute([$userId]);
    $user = $st->fetch(PDO::FETCH_ASSOC);
    if (!$user || ($user['status'] ?? '') !== 'pending_otp') {
        return false;
    }

    $pdo->prepare(
        'UPDATE users SET status = ?, registration_otp = NULL, registration_otp_expires_at = NULL WHERE id = ? AND status = ?'
    )->execute(['pending_verification', $userId, 'pending_otp']);

    require_once __DIR__ . '/../../admin/includes/admin_notifications.php';
    ww_admin_alert_pending_user_verification($pdo, $userId);

    return true;
}

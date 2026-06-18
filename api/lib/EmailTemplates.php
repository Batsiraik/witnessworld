<?php

declare(strict_types=1);

/**
 * Branded HTML + plain-text email bodies (Witness World Connect — #1FAAF2).
 * Uses table layouts for broad client support; no external images required (optional logo URL).
 */

final class EmailTemplates
{
    private const BRAND = '#1FAAF2';
    private const BRAND_DARK = '#1590d4';
    private const NAVY = '#0f2847';
    private const SAND = '#E6E1D3';
    private const MUTED = '#5C6B7A';
    private const BG = '#EEF6FC';

    /** Shown on every OTP email (registration, password reset, admin sign-in). */
    private const OTP_SPAM_HINT =
        'If you don\'t see this email in your inbox within a few minutes, please check your spam or junk folder — your code may have been filtered there.';

    /**
     * @return array{html: string, text: string}
     */
    public static function registrationOtp(string $firstName, string $otp, ?string $logoUrl = null): array
    {
        $safeName = self::e($firstName);
        $safeOtp = self::e($otp);
        $heading = 'Verify your email';
        $intro = "Hi {$safeName}, welcome to Witness World Connect. Use the code below to verify your email and continue creating your account.";
        $html = self::layout(
            preheader: "Your verification code is {$safeOtp}. Expires in 30 minutes.",
            heading: $heading,
            intro: $intro,
            otp: $safeOtp,
            otpLabel: 'Your verification code',
            footerLine: 'This code expires in 30 minutes. If you didn’t create an account, you can ignore this email.',
            logoUrl: $logoUrl
        );
        $text = self::plainRegistration($firstName, $otp);
        return ['html' => $html, 'text' => $text];
    }

    /**
     * @return array{html: string, text: string}
     */
    public static function passwordResetOtp(string $firstName, string $otp, ?string $logoUrl = null): array
    {
        $safeName = self::e($firstName);
        $safeOtp = self::e($otp);
        $heading = 'Reset your password';
        $intro = "Hi {$safeName}, we received a request to reset your Witness World Connect password. Use this code to continue:";
        $html = self::layout(
            preheader: "Your password reset code is {$safeOtp}. Expires in 30 minutes.",
            heading: $heading,
            intro: $intro,
            otp: $safeOtp,
            otpLabel: 'Your reset code',
            footerLine: 'This code expires in 30 minutes. If you didn’t request a reset, you can safely ignore this email.',
            logoUrl: $logoUrl
        );
        $text = self::plainPasswordReset($firstName, $otp);
        return ['html' => $html, 'text' => $text];
    }

    /**
     * @return array{html: string, text: string}
     */
    public static function adminLoginOtp(string $name, string $otp, ?string $logoUrl = null): array
    {
        $safeName = self::e($name);
        $safeOtp = self::e($otp);
        $html = self::layout(
            preheader: "Your admin sign-in code is {$safeOtp}. Expires in 15 minutes.",
            heading: 'Admin sign-in code',
            intro: "Hi {$safeName}, use this code to finish signing in to the Witness World Connect admin panel.",
            otp: $safeOtp,
            otpLabel: 'Your sign-in code',
            footerLine: 'This code expires in 15 minutes. If you did not try to sign in, you can ignore this email.',
            logoUrl: $logoUrl
        );
        $text = "Hi {$name},\n\nYour admin sign-in code is: {$otp}\n\nThis code expires in 15 minutes.\n\n" . self::OTP_SPAM_HINT . "\n\n— Witness World Connect Admin\n";
        return ['html' => $html, 'text' => $text];
    }

    /**
     * @return array{html: string, text: string}
     */
    public static function adminWelcomeCredentials(
        string $name,
        string $username,
        string $password,
        string $loginUrl,
        ?string $logoUrl = null
    ): array {
        $safeName = self::e($name);
        $safeUser = self::e($username);
        $safePass = self::e($password);
        $safeUrl = self::e($loginUrl);
        $brand = self::BRAND;
        $brandDark = self::BRAND_DARK;
        $navy = self::NAVY;
        $muted = self::MUTED;

        $credentialsBox = '
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border-radius:16px;border:1px solid rgba(31,170,242,0.28);">
                <tr><td style="padding:16px 20px 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:' . $brandDark . ';">Username</td></tr>
                <tr><td style="padding:0 20px 16px;font-family:Consolas,Monaco,monospace;font-size:16px;font-weight:700;color:' . $navy . ';">' . $safeUser . '</td></tr>
                <tr><td style="padding:0 20px 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:' . $brandDark . ';">Temporary password</td></tr>
                <tr><td style="padding:0 20px 20px;font-family:Consolas,Monaco,monospace;font-size:15px;font-weight:700;color:' . $navy . ';">' . $safePass . '</td></tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;">
                <a href="' . $safeUrl . '" style="display:inline-block;background:' . $brand . ';color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">Open admin sign-in</a>
              </p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:' . $muted . ';text-align:center;word-break:break-all;">' . $safeUrl . '</p>';

        $html = self::shell(
            preheader: 'You have been added as a Witness World Connect admin. Sign in with the credentials inside.',
            heading: 'Welcome to the admin panel',
            intro: "Hi {$safeName}, you have been added as an administrator for Witness World Connect. Use the credentials below to sign in. You will receive a one-time code by email when signing in from a new browser.",
            mainHtml: $credentialsBox,
            footerLine: 'Please change your password after your first sign-in if your team policy requires it. Keep these details private.',
            logoUrl: $logoUrl
        );
        $text = "Hi {$name},\n\nYou have been added as a Witness World Connect admin.\n\nUsername: {$username}\nPassword: {$password}\n\nSign in: {$loginUrl}\n\nYou will receive a one-time code by email when signing in from a new browser.\n\n— Witness World Connect Admin\n";
        return ['html' => $html, 'text' => $text];
    }

    private static function e(string $s): string
    {
        return htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
    }

    private static function layout(
        string $preheader,
        string $heading,
        string $intro,
        string $otp,
        string $otpLabel,
        string $footerLine,
        ?string $logoUrl
    ): string {
        $navy = self::NAVY;
        $brandDark = self::BRAND_DARK;
        $muted = self::MUTED;
        $otpBlock = '
              <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:' . $brandDark . ';">' . self::e($otpLabel) . '</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border-radius:16px;border:1px solid rgba(31,170,242,0.28);">
                <tr>
                  <td align="center" style="padding:24px 16px;">
                    <span style="font-family:\'SF Mono\',Consolas,Monaco,monospace;font-size:36px;font-weight:800;letter-spacing:0.35em;color:' . $navy . ';">' . $otp . '</span>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.55;color:' . $muted . ';">' . self::e(self::OTP_SPAM_HINT) . '</p>';
        return self::shell($preheader, $heading, $intro, $otpBlock, $footerLine, $logoUrl);
    }

    private static function shell(
        string $preheader,
        string $heading,
        string $intro,
        string $mainHtml,
        string $footerLine,
        ?string $logoUrl
    ): string {
        $pre = self::e($preheader);
        $brand = self::BRAND;
        $navy = self::NAVY;
        $sand = self::SAND;
        $muted = self::MUTED;
        $bg = self::BG;

        $logoBlock = '';
        if ($logoUrl !== null && $logoUrl !== '') {
            $u = self::e($logoUrl);
            $logoBlock = '
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
              <tr>
                <td align="center" style="padding:0;">
                  <img src="' . $u . '" width="132" height="132" alt="Witness World Connect" border="0"
                    style="display:block;width:132px;max-width:132px;height:auto;border:0;outline:none;text-decoration:none;border-radius:28px;" />
                </td>
              </tr>
            </table>';
        } else {
            $logoBlock = '
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
              <tr>
                <td align="center" valign="middle" style="width:72px;height:72px;border-radius:20px;background:' . $brand . ';font-family:Georgia,serif;font-size:36px;font-weight:700;color:#ffffff;line-height:72px;text-align:center;">W</td>
              </tr>
            </table>';
        }

        return '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Witness World Connect</title>
</head>
<body style="margin:0;padding:0;background:' . $bg . ';font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,\'Helvetica Neue\',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . $pre . '</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' . $bg . ';padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 12px 40px rgba(31,170,242,0.12);border:1px solid rgba(31,170,242,0.15);">
          <tr>
            <td bgcolor="#0f2847" style="background-color:' . $navy . ';padding:28px 24px;text-align:center;border-bottom:3px solid ' . $brand . ';">
              ' . $logoBlock . '
              <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:rgba(255,255,255,0.75);">Witness World Connect</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px 24px;">
              <h1 style="margin:0 0 12px;font-size:22px;font-weight:800;color:' . $navy . ';letter-spacing:-0.02em;">' . self::e($heading) . '</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.55;color:' . $muted . ';">' . $intro . '</p>
              ' . $mainHtml . '
              <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:' . $muted . ';">' . self::e($footerLine) . '</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid ' . $sand . ';">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">Connect, share, and grow with friends worldwide.</p>
              <p style="margin:12px 0 0;font-size:11px;color:#cbd5e1;text-align:center;">© ' . date('Y') . ' Witness World Connect</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
    }

    private static function plainRegistration(string $firstName, string $otp): string
    {
        return "Hi {$firstName},\n\nYour Witness World Connect verification code is: {$otp}\n\nThis code expires in 30 minutes.\n\n" . self::OTP_SPAM_HINT . "\n\nIf you didn’t sign up, you can ignore this email.\n\n— Witness World Connect\n";
    }

    private static function plainPasswordReset(string $firstName, string $otp): string
    {
        return "Hi {$firstName},\n\nYour Witness World Connect password reset code is: {$otp}\n\nThis code expires in 30 minutes.\n\n" . self::OTP_SPAM_HINT . "\n\nIf you didn’t request this, you can ignore this email.\n\n— Witness World Connect\n";
    }

    /**
     * Admin moderation / review alert (new submission, signup, report, etc.).
     *
     * @return array{html: string, text: string}
     */
    public static function adminActionRequired(
        string $heading,
        string $intro,
        string $detailHtml,
        string $ctaLabel,
        string $ctaUrl,
        ?string $logoUrl = null
    ): array {
        $brand = self::BRAND;
        $brandDark = self::BRAND_DARK;
        $navy = self::NAVY;
        $muted = self::MUTED;
        $safeUrl = self::e($ctaUrl);
        $main = '
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f9ff;border-radius:16px;border:1px solid rgba(31,170,242,0.28);">
                <tr><td style="padding:16px 20px;font-size:14px;line-height:1.55;color:' . $navy . ';">' . $detailHtml . '</td></tr>
              </table>
              <p style="margin:24px 0 0;text-align:center;">
                <a href="' . $safeUrl . '" style="display:inline-block;background:' . $brand . ';color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;">' . self::e($ctaLabel) . '</a>
              </p>
              <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:' . $muted . ';text-align:center;word-break:break-all;">' . $safeUrl . '</p>';

        $html = self::shell(
            preheader: strip_tags($heading . ' — ' . $intro),
            heading: $heading,
            intro: $intro,
            mainHtml: $main,
            footerLine: 'You are receiving this because you are an administrator for Witness World Connect.',
            logoUrl: $logoUrl
        );
        $text = strip_tags($heading) . "\n\n" . strip_tags($intro) . "\n\n" . strip_tags($detailHtml) . "\n\nOpen: {$ctaUrl}\n\n— Witness World Connect Admin\n";
        return ['html' => $html, 'text' => $text];
    }
}

<?php

declare(strict_types=1);

require_once dirname(__DIR__, 2) . '/admin/includes/settings_store.php';

use PHPMailer\PHPMailer\Exception as MailException;
use PHPMailer\PHPMailer\PHPMailer;

final class Mailer
{
    public function __construct(private PDO $pdo)
    {
    }

    public function send(string $toEmail, string $toName, string $subject, string $htmlBody, string $altBody = ''): bool
    {
        $host = trim((string) ww_get_setting($this->pdo, 'smtp_host', ''));
        $user = (string) ww_get_setting($this->pdo, 'smtp_user', '');
        $pass = (string) ww_get_setting($this->pdo, 'smtp_pass', '');
        $port = (int) ww_get_setting($this->pdo, 'smtp_port', '465');
        $from = trim((string) ww_get_setting($this->pdo, 'smtp_from_email', ''));
        if ($from === '') {
            $from = (string) ww_get_setting($this->pdo, 'support_email', 'noreply@witnessworldconnect.com');
        }
        $enc = strtolower((string) ww_get_setting($this->pdo, 'smtp_encryption', 'ssl'));

        if ($host === '' || $user === '') {
            error_log('[WitnessWorld] SMTP not configured; email skipped. To: ' . $toEmail . ' Subject: ' . $subject);
            return false;
        }

        $mail = new PHPMailer(true);
        try {
            $mail->isSMTP();
            $mail->Host = $host;
            $mail->SMTPAuth = true;
            $mail->Username = $user;
            $mail->Password = $pass;
            $mail->Port = $port > 0 ? $port : 465;
            if ($enc === 'tls') {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            } else {
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            }
            $mail->CharSet = 'UTF-8';
            $mail->setFrom($from, 'Witness World Connect');
            $mail->addAddress($toEmail, $toName);
            $mail->Subject = $subject;
            $mail->isHTML(true);
            $mail->Body = $htmlBody;
            $mail->AltBody = $altBody !== '' ? $altBody : strip_tags($htmlBody);
            $mail->send();
            return true;
        } catch (MailException $e) {
            error_log('[WitnessWorld] Mail error: ' . $mail->ErrorInfo);
            return false;
        }
    }
}

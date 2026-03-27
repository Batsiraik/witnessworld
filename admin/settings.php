<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/settings_store.php';

$pageTitle = 'Settings';
$activeNav = 'settings';

$pdo = witnessworld_pdo();
$flash = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $keys = [
        'support_email',
        'support_user_id',
        'smtp_host',
        'smtp_port',
        'smtp_user',
        'smtp_pass',
        'smtp_from_email',
        'smtp_encryption',
    ];
    foreach ($keys as $k) {
        $v = trim((string) ($_POST[$k] ?? ''));
        if ($k === 'smtp_pass' && $v === '') {
            continue;
        }
        ww_set_setting($pdo, $k, $v);
    }
    $flash = 'Settings saved.';
}

$get = static function (string $k) use ($pdo): string {
    return (string) (ww_get_setting($pdo, $k, '') ?? '');
};

$support = $get('support_email');
$supportUserId = $get('support_user_id');
$smtpHost = $get('smtp_host');
$smtpPort = $get('smtp_port') ?: '465';
$smtpUser = $get('smtp_user');
$smtpPass = $get('smtp_pass');
$smtpFrom = $get('smtp_from_email');
$smtpEnc = $get('smtp_encryption') ?: 'ssl';

$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
$customerSupportHref =
    ($base === '' || $base === '.') ? 'customer_support.php' : $base . '/customer_support.php';

require __DIR__ . '/partials/head.php';
require __DIR__ . '/partials/sidebar.php';
require __DIR__ . '/partials/shell_open.php';
?>

<?php if ($flash !== ''): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><?= htmlspecialchars($flash, ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

<div class="max-w-2xl rounded-2xl border border-slate-100 bg-white p-6 shadow-panel">
  <h2 class="text-base font-semibold text-slate-900">Mobile app contact &amp; SMTP</h2>
  <p class="mt-1 text-sm text-slate-500">
    The address below is saved in the database and returned by the API to the app. Users see it on the dashboard when they are
    <strong class="text-slate-700">waiting for verification</strong> (24-hour message) or if their account was
    <strong class="text-slate-700">declined</strong>.
  </p>
  <form method="post" class="mt-6 space-y-4">
    <div>
      <label class="text-xs font-semibold text-slate-600">Admin / support email</label>
      <input
        type="email"
        name="support_email"
        value="<?= htmlspecialchars($support, ENT_QUOTES, 'UTF-8') ?>"
        class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        placeholder="support@witnessworldconnect.com"
        required
      />
      <p class="mt-1 text-xs text-slate-500">Stored as <code class="rounded bg-slate-100 px-1">settings.support_email</code> — change anytime; the app picks it up on next refresh.</p>
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">Support user ID (app account)</label>
      <input
        type="number"
        min="0"
        step="1"
        name="support_user_id"
        value="<?= htmlspecialchars($supportUserId, ENT_QUOTES, 'UTF-8') ?>"
        class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        placeholder="0 = disabled"
      />
      <p class="mt-1 text-xs text-slate-500">
        Numeric <code class="rounded bg-slate-100 px-1">users.id</code> for the account that sends in-app replies (create a dedicated verified member, e.g. “Witness Support”). Required for the blue support button and
        <a href="<?= htmlspecialchars($customerSupportHref, ENT_QUOTES, 'UTF-8') ?>" class="font-semibold text-brand underline">Customer support</a>.
      </p>
    </div>
    <hr class="border-slate-100" />
    <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Outgoing mail (OTP &amp; notifications)</p>
    <div>
      <label class="text-xs font-semibold text-slate-600">SMTP host</label>
      <input name="smtp_host" value="<?= htmlspecialchars($smtpHost, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="smtp.hostinger.com" />
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="text-xs font-semibold text-slate-600">SMTP port</label>
        <input name="smtp_port" value="<?= htmlspecialchars($smtpPort, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="text-xs font-semibold text-slate-600">Encryption</label>
        <select name="smtp_encryption" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="ssl" <?= $smtpEnc === 'ssl' ? 'selected' : '' ?>>SSL</option>
          <option value="tls" <?= $smtpEnc === 'tls' ? 'selected' : '' ?>>TLS</option>
        </select>
      </div>
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">SMTP username</label>
      <input name="smtp_user" value="<?= htmlspecialchars($smtpUser, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" autocomplete="off" />
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">SMTP password</label>
      <input type="password" name="smtp_pass" value="" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="<?= $smtpPass !== '' ? '(unchanged — enter new to replace)' : '' ?>" autocomplete="new-password" />
    </div>
    <div>
      <label class="text-xs font-semibold text-slate-600">From email</label>
      <input name="smtp_from_email" value="<?= htmlspecialchars($smtpFrom, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" placeholder="noreply@yourdomain.com" />
    </div>
    <button type="submit" class="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark">Save settings</button>
  </form>
</div>

<div class="mt-8 max-w-2xl rounded-2xl border border-brand/20 bg-gradient-to-br from-brand-muted/40 to-white p-6 shadow-panel ring-1 ring-brand/10">
  <h2 class="text-base font-semibold text-slate-900">Hostinger email — where to find SMTP</h2>
  <p class="mt-2 text-sm leading-relaxed text-slate-600">
    After you create a mailbox in Hostinger, open <strong class="text-slate-800">hPanel</strong> →
    <strong class="text-slate-800">Emails</strong> → select your domain → open the email account you created.
    Look for <strong class="text-slate-800">Configuration details</strong>, <strong class="text-slate-800">Email apps</strong>,
    or <strong class="text-slate-800">Manual configuration</strong> — Hostinger shows the same SMTP values for all clients.
  </p>
  <p class="mt-3 text-sm leading-relaxed text-slate-600">
    Typical values (confirm in your panel — they can vary by product):
  </p>
  <ul class="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
    <li><strong>Outgoing server (SMTP):</strong> <code class="rounded bg-slate-100 px-1.5 py-0.5 text-xs">smtp.hostinger.com</code></li>
    <li><strong>Port 465</strong> with <strong>SSL</strong> — or <strong>Port 587</strong> with <strong>TLS</strong> if 465 fails</li>
    <li><strong>Username:</strong> your full email address (e.g. <code class="rounded bg-slate-100 px-1 py-0.5 text-xs">hello@yourdomain.com</code>)</li>
    <li><strong>Password:</strong> the password you set for that mailbox (not your hPanel login)</li>
  </ul>
  <p class="mt-4 text-sm text-slate-600">
    Official guide:
    <a href="https://www.hostinger.com/support/1575756-how-to-get-email-account-configuration-details-for-hostinger-email" class="font-semibold text-brand hover:underline" target="_blank" rel="noopener noreferrer">How to get email account configuration details (Hostinger)</a>
  </p>
  <p class="mt-3 text-xs leading-relaxed text-slate-500">
    In this admin form: set <strong>From email</strong> to the same mailbox (or another verified sender Hostinger allows).
    OTP emails use your brand template (#1FAAF2); optional logo URL is in <code class="rounded bg-slate-100 px-1">api/config.php</code> as <code class="rounded bg-slate-100 px-1">WW_EMAIL_LOGO_URL</code>.
  </p>
</div>

<?php require __DIR__ . '/partials/shell_close.php'; ?>

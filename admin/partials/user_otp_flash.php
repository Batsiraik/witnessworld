<?php
if (isset($_GET['otp_resent']) && $_GET['otp_resent'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Verification code resent to the user&apos;s email.</div>
<?php elseif (isset($_GET['otp_mail_failed']) && $_GET['otp_mail_failed'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">A new code was generated, but the email could not be sent. Check SMTP settings under Admin settings.</div>
<?php elseif (isset($_GET['otp_bypassed']) && $_GET['otp_bypassed'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Email verification bypassed. User is now pending your approve/decline decision.</div>
<?php elseif (isset($_GET['profile_updated']) && $_GET['profile_updated'] === '1'): ?>
  <div class="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">Profile details updated.</div>
<?php elseif (!empty($_GET['profile_error'])): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><?= htmlspecialchars((string) $_GET['profile_error'], ENT_QUOTES, 'UTF-8') ?></div>
<?php elseif (!empty($_GET['otp_error'])): ?>
  <div class="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><?= htmlspecialchars((string) $_GET['otp_error'], ENT_QUOTES, 'UTF-8') ?></div>
<?php endif; ?>

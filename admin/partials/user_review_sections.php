<?php
/** @var array<string,mixed> $user */
/** @var string $support */
/** @var int $id */
/** @var string $formReturn '' = stay on user.php after POST; 'users' = back to users list */
/** @var bool $showOpenFullPageLink show link to user.php (modal context only) */
$formReturn = $formReturn ?? '';
$showOpenFullPageLink = $showOpenFullPageLink ?? false;
require_once __DIR__ . '/../includes/registration_poll_labels.php';
require_once __DIR__ . '/../includes/profile_edit.php';
$pollAcct = (string) ($user['registration_account_type'] ?? '');
$pollPurpose = (string) ($user['registration_primary_purpose'] ?? '');
$pollAccountManager = (string) ($user['registration_wants_account_manager'] ?? '');
$pollReferral = (string) ($user['registration_referral_source'] ?? '');
$pollReferralOther = (string) ($user['registration_referral_other'] ?? '');
$hasPollAnswers = $pollAcct !== '' || $pollPurpose !== '' || $pollAccountManager !== '' || $pollReferral !== '';
$memberTypes = ww_profile_allowed_member_types();
$countryMap = ww_listing_country_map();
$currentCountry = strtoupper(trim((string) ($user['registration_country_code'] ?? '')));
$dobVal = substr((string) ($user['date_of_birth'] ?? ''), 0, 10);
$baptismVal = substr((string) ($user['baptism_date'] ?? ''), 0, 10);
$canEditProfile = !$showOpenFullPageLink;
?>
<div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
  <div class="flex flex-wrap items-start justify-between gap-2">
    <div>
      <h3 class="text-sm font-semibold text-slate-900">Profile</h3>
      <?php if ($canEditProfile): ?>
        <p class="mt-1 text-xs text-slate-500">Admins can update these details for the member. Changes here do not require re-verification.</p>
      <?php endif; ?>
    </div>
    <?php if ($showOpenFullPageLink): ?>
      <a href="user.php?id=<?= (int) $id ?>" class="text-xs font-semibold text-brand hover:underline" target="_blank" rel="noopener">Edit on full page →</a>
    <?php endif; ?>
  </div>

  <?php if ($canEditProfile): ?>
  <form method="post" action="user.php?id=<?= (int) $id ?>" class="mt-4 space-y-4">
    <input type="hidden" name="action" value="update_profile" />
    <?php if ($formReturn !== ''): ?>
      <input type="hidden" name="return" value="<?= htmlspecialchars($formReturn, ENT_QUOTES, 'UTF-8') ?>" />
    <?php endif; ?>
    <div class="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-first-name">First name</label>
        <input id="edit-first-name" name="first_name" required value="<?= htmlspecialchars((string) ($user['first_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-last-name">Last name</label>
        <input id="edit-last-name" name="last_name" required value="<?= htmlspecialchars((string) ($user['last_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-username">Username</label>
        <input id="edit-username" name="username" required value="<?= htmlspecialchars((string) ($user['username'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-email">Email</label>
        <input id="edit-email" type="email" name="email" required value="<?= htmlspecialchars((string) ($user['email'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-phone">Phone</label>
        <input id="edit-phone" name="phone" required value="<?= htmlspecialchars((string) ($user['phone'] ?? ''), ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-dob">Date of birth</label>
        <input id="edit-dob" type="date" name="date_of_birth" required value="<?= htmlspecialchars($dobVal, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-member-type">Member type</label>
        <select id="edit-member-type" name="member_type" required class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <?php foreach ($memberTypes as $mt): ?>
            <option value="<?= htmlspecialchars($mt, ENT_QUOTES, 'UTF-8') ?>" <?= strcasecmp((string) ($user['member_type'] ?? ''), $mt) === 0 ? 'selected' : '' ?>><?= htmlspecialchars($mt, ENT_QUOTES, 'UTF-8') ?></option>
          <?php endforeach; ?>
        </select>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-600" for="edit-baptism">Baptism date</label>
        <input id="edit-baptism" type="date" name="baptism_date" value="<?= htmlspecialchars($baptismVal, ENT_QUOTES, 'UTF-8') ?>" class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        <p class="mt-1 text-[11px] text-slate-500">Optional for Unbaptized publisher.</p>
      </div>
      <div class="sm:col-span-2">
        <label class="block text-xs font-semibold text-slate-600" for="edit-country">Country</label>
        <select id="edit-country" name="registration_country_code" required class="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm">
          <option value="">Select country</option>
          <?php foreach ($countryMap as $code => $name): ?>
            <option value="<?= htmlspecialchars($code, ENT_QUOTES, 'UTF-8') ?>" <?= $currentCountry === $code ? 'selected' : '' ?>><?= htmlspecialchars($name, ENT_QUOTES, 'UTF-8') ?></option>
          <?php endforeach; ?>
        </select>
      </div>
    </div>
    <?php if (trim((string) ($user['congregation'] ?? '')) !== ''): ?>
      <p class="text-xs text-slate-500">Congregation on file (legacy): <span class="font-medium text-slate-700"><?= htmlspecialchars((string) $user['congregation'], ENT_QUOTES, 'UTF-8') ?></span></p>
    <?php endif; ?>
    <p class="text-xs text-slate-500">Joined <?= htmlspecialchars((string) $user['created_at'], ENT_QUOTES, 'UTF-8') ?></p>
    <button type="submit" class="admin-btn admin-btn--primary">Save profile changes</button>
  </form>
  <?php else: ?>
  <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
    <div><dt class="text-slate-500">Phone</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $user['phone'], ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Date of birth</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['date_of_birth'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">I am a</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['member_type'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Baptism date</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['baptism_date'] ?? 'Not provided'), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Congregation</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['congregation'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Country</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) ($user['registration_country_name'] ?? ''), ENT_QUOTES, 'UTF-8') ?></dd></div>
    <div><dt class="text-slate-500">Joined</dt><dd class="font-medium text-slate-900"><?= htmlspecialchars((string) $user['created_at'], ENT_QUOTES, 'UTF-8') ?></dd></div>
  </dl>
  <?php endif; ?>
</div>

<?php if ($hasPollAnswers): ?>
<div class="rounded-2xl border border-slate-100 bg-white p-5 shadow-panel">
  <h3 class="text-sm font-semibold text-slate-900">Verification poll</h3>
  <p class="mt-1 text-xs text-slate-500">Answers submitted while waiting for account approval.</p>
  <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
    <div class="sm:col-span-2">
      <dt class="text-slate-500">1. Individual or Business</dt>
      <dd class="font-medium text-slate-900"><?= htmlspecialchars(ww_poll_account_type_label($pollAcct), ENT_QUOTES, 'UTF-8') ?></dd>
      <dd class="mt-1 text-xs text-slate-500">Primary focus at signup — members can use personal and business features on one account.</dd>
    </div>
    <div class="sm:col-span-2">
      <dt class="text-slate-500">2. Account manager support</dt>
      <dd class="font-medium text-slate-900"><?= htmlspecialchars(ww_poll_account_manager_label($pollAccountManager), ENT_QUOTES, 'UTF-8') ?></dd>
    </div>
    <div class="sm:col-span-2">
      <dt class="text-slate-500">3. Primary purpose</dt>
      <dd class="font-medium text-slate-900"><?= htmlspecialchars(ww_poll_primary_purpose_label($pollPurpose), ENT_QUOTES, 'UTF-8') ?></dd>
    </div>
    <div class="sm:col-span-2">
      <dt class="text-slate-500">4. How they heard about WWC</dt>
      <dd class="font-medium text-slate-900"><?= htmlspecialchars(ww_poll_referral_label($pollReferral, $pollReferralOther), ENT_QUOTES, 'UTF-8') ?></dd>
    </div>
  </dl>
</div>
<?php endif; ?>

<?php if (($user['status'] ?? '') === 'pending_otp'): ?>
  <div class="rounded-2xl border border-sky-200 bg-sky-50/80 p-5 shadow-panel">
    <p class="text-sm font-semibold text-sky-900">This user has not verified their email yet.</p>
    <p class="mt-1 text-xs text-sky-800">They are stuck on the registration OTP step. You can resend the code or bypass email verification so they enter the normal approval queue.</p>
    <form method="post" action="user.php?id=<?= (int) $id ?>" class="mt-4 flex flex-wrap gap-3">
      <?php if ($formReturn !== ''): ?>
        <input type="hidden" name="return" value="<?= htmlspecialchars($formReturn, ENT_QUOTES, 'UTF-8') ?>" />
      <?php endif; ?>
      <button type="submit" name="action" value="resend_otp" class="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">Resend OTP email</button>
      <button type="submit" name="action" value="verify_email" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700" onclick="return confirm('Bypass email OTP for this user? They will move to Pending verification and still need your approve/decline decision.');">Bypass email OTP</button>
    </form>
  </div>
<?php endif; ?>

<?php if (($user['status'] ?? '') === 'pending_verification'): ?>
  <div class="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-panel">
    <p class="text-sm font-semibold text-amber-900">This user is waiting for your decision.</p>
    <form method="post" action="user.php?id=<?= (int) $id ?>" class="mt-4 flex flex-wrap gap-3">
      <?php if ($formReturn !== ''): ?>
        <input type="hidden" name="return" value="<?= htmlspecialchars($formReturn, ENT_QUOTES, 'UTF-8') ?>" />
      <?php endif; ?>
      <button type="submit" name="action" value="approve" class="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Approve</button>
      <button type="submit" name="action" value="decline" class="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700" onclick="return confirm('Decline this user? They will see a message with support email: <?= htmlspecialchars($support, ENT_QUOTES, 'UTF-8') ?>.');">Decline</button>
    </form>
  </div>
<?php endif; ?>

<?php require __DIR__ . '/user_admin_actions.php'; ?>

<?php if ($showOpenFullPageLink): ?>
  <p class="text-center text-xs text-slate-500">
    <a class="font-semibold text-brand hover:underline" href="user.php?id=<?= (int) $id ?>" target="_blank" rel="noopener">Open full page</a>
  </p>
<?php endif; ?>

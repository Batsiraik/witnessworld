/**
 * Verification lock — mirrors mobile VerificationLockOverlay on DashboardScreen.
 */
(function (global) {
  const { apiPost } = global.WWC_API;

  const POLL_MS = 30_000;
  let pollTimer = null;
  let lastHydratedPollKey = null;
  let inited = false;

  const ACCOUNT_OPTIONS = [
    { value: 'individual', label: 'Individual', hint: 'Browse, shop, connect, and use personal features — you can still add listings or a business later' },
    { value: 'business', label: 'Business', hint: 'Promote a business, storefront, or services — you can still browse and shop personally too' },
  ];

  const PURPOSE_OPTIONS = [
    { value: 'browsing_connecting', label: 'Browsing & Connecting', hint: 'Explore the marketplace, rentals, roommate finder, and professional services' },
    { value: 'promoting_business', label: 'Promoting a Business or Service', hint: 'Showcase your business directory listing, digital services, or storefront' },
    { value: 'both', label: 'Both', hint: 'Offer services/goods and browse other listings on the same account' },
  ];

  const MANAGER_OPTIONS = [
    { value: 'yes', label: 'Yes, please', hint: 'I would like a WWC account manager to help set up and manage my listings' },
    { value: 'no', label: 'No, thank you', hint: 'I will create and manage my own listings in the app' },
  ];

  const REFERRAL_OPTIONS = [
    { value: 'friend_family', label: 'Friend / Family' },
    { value: 'social_media', label: 'Social Media' },
    { value: 'whatsapp_group', label: 'WhatsApp Group' },
    { value: 'wwc_team_member', label: 'WWC Team Member' },
    { value: 'other', label: 'Other' },
  ];

  const state = {
    accountType: null,
    primaryPurpose: null,
    wantsAccountManager: null,
    referralSource: null,
    referralOther: '',
    submitBusy: false,
    submitError: '',
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pollFieldsFromUser(user) {
    return {
      accountType: user?.registration_account_type ?? null,
      primaryPurpose: user?.registration_primary_purpose ?? null,
      wantsAccountManager: user?.registration_wants_account_manager ?? null,
      referralSource: user?.registration_referral_source ?? null,
      referralOther: user?.registration_referral_other ?? '',
    };
  }

  function isPollComplete(user) {
    if (!user) return false;
    if (!user.registration_account_type || !user.registration_primary_purpose || !user.registration_wants_account_manager || !user.registration_referral_source) {
      return false;
    }
    if (user.registration_referral_source === 'other') {
      return Boolean(String(user.registration_referral_other || '').trim());
    }
    return true;
  }

  function ensureOverlay() {
    if (document.getElementById('wwc-verify-lock')) return;
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="wwc-verify-lock" id="wwc-verify-lock" hidden role="dialog" aria-modal="true" aria-labelledby="wwc-verify-title">
        <div class="wwc-verify-scrim"></div>
        <div class="wwc-verify-card-wrap">
          <div class="wwc-verify-card">
            <div id="wwc-verify-content"></div>
          </div>
        </div>
      </div>`
    );
  }

  function radioGroup(name, options, selected, hints) {
    return options
      .map((opt) => {
        const on = selected === opt.value;
        const hint = hints && opt.hint ? `<span class="wwc-verify-opt-hint">${escapeHtml(opt.hint)}</span>` : '';
        return `
          <label class="wwc-verify-opt${on ? ' is-on' : ''}">
            <input type="radio" name="${name}" value="${escapeHtml(opt.value)}"${on ? ' checked' : ''} />
            <span class="wwc-verify-opt-body">
              <span class="wwc-verify-opt-label">${escapeHtml(opt.label)}</span>
              ${hint}
            </span>
          </label>`;
      })
      .join('');
  }

  function renderPollForm() {
    const err = state.submitError ? `<p class="wwc-verify-error">${escapeHtml(state.submitError)}</p>` : '';
    const canSubmit =
      state.accountType &&
      state.primaryPurpose &&
      state.wantsAccountManager &&
      state.referralSource &&
      (state.referralSource !== 'other' || state.referralOther.trim().length >= 2);

    return `
      <h2 class="wwc-verify-title" id="wwc-verify-title">Your account is yet to be verified</h2>
      <p class="wwc-verify-intro">To help us review your account, please answer these quick questions.</p>
      <div class="wwc-verify-notice">Your account is being reviewed. This screen will stay until you are approved — you do not need to sign out or refresh.</div>

      <p class="wwc-verify-section">1. Account type</p>
      <p class="wwc-verify-q">Are you registering mainly as an Individual or a Business? <span class="wwc-req">*</span></p>
      <div class="wwc-verify-info">You can do both on one account. This helps us understand your main focus for review — it does not lock you in.</div>
      <div class="wwc-verify-opts" data-poll="accountType">${radioGroup('accountType', ACCOUNT_OPTIONS, state.accountType, true)}</div>

      <p class="wwc-verify-section">2. Account manager</p>
      <p class="wwc-verify-q">Would you like a WWC account manager to help create and manage your listings? <span class="wwc-req">*</span></p>
      <div class="wwc-verify-opts" data-poll="wantsAccountManager">${radioGroup('wantsAccountManager', MANAGER_OPTIONS, state.wantsAccountManager, true)}</div>

      <p class="wwc-verify-section">3. Primary purpose</p>
      <p class="wwc-verify-q">What is the primary purpose of your registration? <span class="wwc-req">*</span></p>
      <div class="wwc-verify-opts" data-poll="primaryPurpose">${radioGroup('primaryPurpose', PURPOSE_OPTIONS, state.primaryPurpose, true)}</div>

      <p class="wwc-verify-section">4. Referral</p>
      <p class="wwc-verify-q">How did you hear about Witness World Connect? <span class="wwc-req">*</span></p>
      <div class="wwc-verify-opts" data-poll="referralSource">${radioGroup('referralSource', REFERRAL_OPTIONS, state.referralSource, false)}</div>
      ${state.referralSource === 'other' ? `<input type="text" class="wwc-verify-other" id="wwc-verify-other" placeholder="Please specify" maxlength="200" value="${escapeHtml(state.referralOther)}" />` : ''}
      ${err}
      <button type="button" class="wwc-btn wwc-btn-primary wwc-verify-submit" id="wwc-verify-submit"${canSubmit ? '' : ' disabled'}>${state.submitBusy ? 'Saving…' : 'Continue'}</button>`;
  }

  function renderWaiting(variant, supportEmail, supportAvailable) {
    const declined = variant === 'declined';
    const title = declined ? 'Account not approved' : 'Your account is yet to be verified';
    const body = declined
      ? 'Your registration was not approved. For further details, contact:'
      : 'Verification will take up to 24 hours. If it takes longer, please contact admin at:';
    const supportBtn =
      supportAvailable && !declined
        ? `<button type="button" class="wwc-btn wwc-btn-primary wwc-verify-support" id="wwc-verify-support">Message Customer Support</button>`
        : '';
    const notice = declined
      ? ''
      : `<div class="wwc-verify-notice">Your account is being reviewed. You can stay on this page — approval will unlock the app automatically.</div>`;
    const hint = declined
      ? ''
      : `<p class="wwc-verify-hint">We&apos;ll update this screen as soon as your account is approved. Until then, browsing and posting in the app are paused.</p>`;

    return `
      <h2 class="wwc-verify-title" id="wwc-verify-title">${title}</h2>
      ${notice}
      <p class="wwc-verify-body">${body}</p>
      <a class="wwc-verify-email" href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>
      ${supportBtn}
      ${hint}`;
  }

  function hydratePollFromUser(user) {
    const key = JSON.stringify(pollFieldsFromUser(user));
    if (lastHydratedPollKey === key) return;
    lastHydratedPollKey = key;
    const f = pollFieldsFromUser(user);
    state.accountType = f.accountType;
    state.primaryPurpose = f.primaryPurpose;
    state.wantsAccountManager = f.wantsAccountManager;
    state.referralSource = f.referralSource;
    state.referralOther = f.referralOther || '';
    state.submitError = '';
  }

  function bindPollEvents() {
    const root = document.getElementById('wwc-verify-content');
    if (!root) return;

    root.querySelectorAll('.wwc-verify-opts').forEach((group) => {
      const field = group.getAttribute('data-poll');
      group.querySelectorAll('input[type="radio"]').forEach((input) => {
        input.addEventListener('change', () => {
          if (field === 'accountType') state.accountType = input.value;
          if (field === 'primaryPurpose') state.primaryPurpose = input.value;
          if (field === 'wantsAccountManager') state.wantsAccountManager = input.value;
          if (field === 'referralSource') state.referralSource = input.value;
          render();
        });
      });
    });

    root.querySelector('#wwc-verify-other')?.addEventListener('input', (e) => {
      state.referralOther = e.target.value;
      render();
    });

    root.querySelector('#wwc-verify-submit')?.addEventListener('click', () => void submitPoll());
    root.querySelector('#wwc-verify-support')?.addEventListener('click', () => void openSupport());
  }

  async function submitPoll() {
    if (state.submitBusy) return;
    state.submitBusy = true;
    state.submitError = '';
    render();
    try {
      const data = await apiPost('registration-account-type.php', {
        account_type: state.accountType,
        primary_purpose: state.primaryPurpose,
        wants_account_manager: state.wantsAccountManager,
        referral_source: state.referralSource,
        referral_other: state.referralSource === 'other' ? state.referralOther.trim() : undefined,
      });
      global.WWC_AUTH.patchUser({
        registration_account_type: data.registration_account_type,
        registration_primary_purpose: data.registration_primary_purpose,
        registration_wants_account_manager: data.registration_wants_account_manager,
        registration_referral_source: data.registration_referral_source,
        registration_referral_other: data.registration_referral_other || null,
      });
    } catch (e) {
      state.submitError = e.message || 'Could not save. Please try again.';
    } finally {
      state.submitBusy = false;
      render();
    }
  }

  async function openSupport() {
    try {
      const data = await apiPost('support-open-conversation.php', {});
      const id = data.conversation_id;
      if (id) window.location.href = `chat.html?conversation_id=${id}`;
    } catch (e) {
      alert(e.message || 'Could not open support chat.');
    }
  }

  function render() {
    ensureOverlay();
    const el = document.getElementById('wwc-verify-lock');
    const content = document.getElementById('wwc-verify-content');
    if (!el || !content) return;

    const auth = global.WWC_AUTH;
    const locked = auth.isVerificationLocked();
    if (!locked) {
      el.hidden = true;
      document.body.classList.remove('wwc-verification-locked');
      stopPolling();
      return;
    }

    const user = auth.getUser();
    const variant = auth.getUserStatus() === 'declined' ? 'declined' : 'pending';
    const showPoll = variant === 'pending' && !isPollComplete(user);

    if (showPoll) hydratePollFromUser(user);

    content.innerHTML = showPoll
      ? renderPollForm()
      : renderWaiting(variant, auth.getSupportEmail(), auth.isSupportAvailable());

    el.hidden = false;
    document.body.classList.add('wwc-verification-locked');
    bindPollEvents();
    startPolling(auth.getUserStatus());
  }

  function startPolling(status) {
    stopPolling();
    if (status !== 'pending_verification') return;
    pollTimer = setInterval(() => {
      void global.WWC_AUTH.refreshProfile();
    }, POLL_MS);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function init() {
    if (inited) {
      render();
      return;
    }
    inited = true;
    ensureOverlay();
    global.WWC_AUTH.subscribe(render);
    render();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && global.WWC_AUTH.isVerificationLocked()) {
        void global.WWC_AUTH.refreshProfile();
      }
    });
  }

  global.WWC_VERIFY = { init, render };

  if (global.WWC_AUTH) init();
})(window);

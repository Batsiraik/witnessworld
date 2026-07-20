(function () {
  const { apiGet, apiPost, setToken } = WWC_API;
  const form = document.getElementById('reg-form');
  const otpBox = document.getElementById('otp-box');
  const errEl = document.getElementById('reg-error');
  const memberType = document.getElementById('member_type');
  const baptismInput = document.getElementById('baptism_date');
  const baptismLabel = document.getElementById('baptism_label');
  const dobInput = document.getElementById('dob');
  let regEmail = '';

  const SIGNUP_MIN_AGE = 16;

  function isoDate(d) {
    return d.toISOString().slice(0, 10);
  }

  function setupDateLimits() {
    const today = new Date();
    const maxDob = new Date(today);
    maxDob.setFullYear(maxDob.getFullYear() - SIGNUP_MIN_AGE);
    if (dobInput) {
      dobInput.max = isoDate(maxDob);
      dobInput.min = '1920-01-01';
    }
    if (baptismInput) baptismInput.max = isoDate(today);
  }

  function isUnbaptized(role) {
    return role.trim().toLowerCase() === 'unbaptized publisher';
  }

  function updateBaptismField() {
    const unbaptized = isUnbaptized(memberType?.value || '');
    if (baptismLabel) {
      baptismLabel.textContent = unbaptized ? 'Baptism date (optional)' : 'Baptism date';
    }
    if (baptismInput) {
      baptismInput.required = !unbaptized;
      if (unbaptized) baptismInput.removeAttribute('required');
    }
  }

  async function loadCountries() {
    try {
      const data = await apiGet('locations.php', true);
      const sel = document.getElementById('country');
      if (!sel || !Array.isArray(data.countries)) return;
      sel.innerHTML = '<option value="">Select country</option>' + data.countries.map((c) => `<option value="${c.code}">${WWC_UTIL.escapeHtml(c.name)}</option>`).join('');
    } catch { /* */ }
  }

  function showErr(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  memberType?.addEventListener('change', updateBaptismField);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    try {
      const role = memberType.value;
      const baptismVal = baptismInput?.value.trim() || '';
      if (!isUnbaptized(role) && !baptismVal) {
        showErr('Baptism date is required for your member type.');
        return;
      }
      const data = await apiPost('register.php', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        username: document.getElementById('username').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date_of_birth: dobInput.value,
        member_type: role,
        baptism_date: baptismVal || null,
        registration_country_code: document.getElementById('country').value,
        membership_plan: 'free',
      }, true);
      regEmail = data.email || document.getElementById('email').value.trim();
      form.hidden = true;
      otpBox.hidden = false;
      document.getElementById('otp-email').textContent = regEmail;
    } catch (ex) {
      showErr(ex.message);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const btn = document.getElementById('otp-btn');
    btn.disabled = true;
    try {
      const data = await apiPost('verify-registration-otp.php', {
        email: regEmail,
        otp: document.getElementById('otp').value.trim(),
      }, true);
      if (data.token) setToken(data.token);
      window.location.replace('index.html');
    } catch (ex) {
      showErr(ex.message);
    } finally {
      btn.disabled = false;
    }
  });

  const resendBtn = document.getElementById('otp-resend-btn');
  let resendCooldown = 0;
  let resendTimer = null;

  function updateResendBtn() {
    if (!resendBtn) return;
    if (resendCooldown > 0) {
      resendBtn.disabled = true;
      resendBtn.textContent = `Resend code in ${resendCooldown}s`;
    } else {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend code';
    }
  }

  resendBtn?.addEventListener('click', async () => {
    if (!regEmail || resendCooldown > 0) return;
    errEl.hidden = true;
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending…';
    try {
      await apiPost('resend-registration-otp.php', { email: regEmail }, true);
      resendCooldown = 45;
      updateResendBtn();
      resendTimer = setInterval(() => {
        resendCooldown -= 1;
        updateResendBtn();
        if (resendCooldown <= 0 && resendTimer) {
          clearInterval(resendTimer);
          resendTimer = null;
        }
      }, 1000);
    } catch (ex) {
      const wait = ex.data?.retry_after;
      if (typeof wait === 'number' && wait > 0) {
        resendCooldown = wait;
        updateResendBtn();
      }
      showErr(ex.message || 'Could not resend code.');
    }
  });

  WWC_PAGE.init({
    authPage: true,
    onReady: async () => {
      setupDateLimits();
      updateBaptismField();
      await loadCountries();
      const params = new URLSearchParams(window.location.search);
      if (params.get('step') === 'otp') {
        regEmail = sessionStorage.getItem('wwc_pending_otp_email') || '';
        if (regEmail && form && otpBox) {
          form.hidden = true;
          otpBox.hidden = false;
          document.getElementById('otp-email').textContent = regEmail;
        }
      }
    },
  });
})();

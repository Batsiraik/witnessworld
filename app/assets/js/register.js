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
        congregation: document.getElementById('congregation').value.trim(),
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

  WWC_PAGE.init({
    authPage: true,
    onReady: async () => {
      setupDateLimits();
      updateBaptismField();
      await loadCountries();
    },
  });
})();

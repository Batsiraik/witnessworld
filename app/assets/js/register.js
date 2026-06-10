(function () {
  const { apiGet, apiPost, setToken } = WWC_API;
  const form = document.getElementById('reg-form');
  const otpBox = document.getElementById('otp-box');
  const errEl = document.getElementById('reg-error');
  let regEmail = '';

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

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errEl.hidden = true;
    const btn = document.getElementById('reg-btn');
    btn.disabled = true;
    try {
      const data = await apiPost('register.php', {
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value,
        first_name: document.getElementById('first_name').value.trim(),
        last_name: document.getElementById('last_name').value.trim(),
        username: document.getElementById('username').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        date_of_birth: document.getElementById('dob').value.trim(),
        member_type: document.getElementById('member_type').value,
        baptism_date: document.getElementById('baptism_date').value.trim() || null,
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

  WWC_PAGE.init({ onReady: loadCountries });
})();

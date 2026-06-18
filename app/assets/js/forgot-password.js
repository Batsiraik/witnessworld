(function () {
  const { apiPost, setToken } = WWC_API;

  const stepEmail = document.getElementById('step-email');
  const stepOtp = document.getElementById('step-otp');
  const stepPassword = document.getElementById('step-password');

  let resetEmail = '';
  let resetToken = '';

  function showErr(el, msg) {
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
  }

  function hideErrs() {
    ['fp-error', 'fp-error-otp', 'fp-error-pw'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = true;
    });
  }

  function showStep(step) {
    stepEmail.hidden = step !== 'email';
    stepOtp.hidden = step !== 'otp';
    stepPassword.hidden = step !== 'password';
  }

  document.getElementById('email-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErrs();
    const btn = document.getElementById('email-btn');
    btn.disabled = true;
    try {
      resetEmail = document.getElementById('email').value.trim().toLowerCase();
      await apiPost('forgot-password.php', { email: resetEmail }, true);
      document.getElementById('otp-email').textContent = resetEmail;
      showStep('otp');
    } catch (ex) {
      showErr(document.getElementById('fp-error'), ex.message || 'Request failed.');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('otp-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErrs();
    const btn = document.getElementById('otp-btn');
    btn.disabled = true;
    try {
      const otp = document.getElementById('otp').value.replace(/\D/g, '');
      const data = await apiPost('verify-reset-otp.php', { email: resetEmail, otp }, true);
      resetToken = data.reset_token;
      if (!resetToken) throw new Error('No reset token returned.');
      showStep('password');
    } catch (ex) {
      showErr(document.getElementById('fp-error-otp'), ex.message || 'Verification failed.');
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideErrs();
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm_password').value;
    const errEl = document.getElementById('fp-error-pw');
    if (password.length < 8) {
      showErr(errEl, 'Use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      showErr(errEl, 'Passwords do not match.');
      return;
    }
    const btn = document.getElementById('pw-btn');
    btn.disabled = true;
    try {
      setToken(null);
      const data = await apiPost('reset-password.php', {
        email: resetEmail,
        reset_token: resetToken,
        password,
        confirm_password: confirm,
      }, true);
      if (data.token) setToken(data.token);
      window.location.replace('index.html');
    } catch (ex) {
      showErr(errEl, ex.message || 'Could not reset password.');
    } finally {
      btn.disabled = false;
    }
  });

  WWC_PAGE.init({
    onReady: async () => {
      if (WWC_AUTH.isLoggedIn()) {
        window.location.replace('index.html');
      }
    },
  });
})();

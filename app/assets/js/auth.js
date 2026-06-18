/**
 * Session bootstrap — mirrors mobile DashboardScreen + VerificationLockOverlay.
 */
(function (global) {
  const { apiGet, getToken, setToken } = global.WWC_API;

  const BOOTSTRAP_TIMEOUT_MS = 8_000;
  const ME_FETCH_TIMEOUT_MS = 8_000;

  let currentUser = null;
  let subscription = null;
  let supportEmail = 'support@witnessworldconnect.com';
  let supportAvailable = false;
  const listeners = new Set();

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function notify() {
    listeners.forEach((fn) => {
      try {
        fn({ user: currentUser, isLoggedIn: !!currentUser });
      } catch {
        /* ignore */
      }
    });
  }

  function applySessionData(data) {
    if (!data?.ok || !data.user) return false;
    currentUser = data.user;
    subscription = data.subscription ?? null;
    if (typeof data.support_email === 'string' && data.support_email) {
      supportEmail = data.support_email;
    }
    supportAvailable = data.support_available === true;
    notify();
    return true;
  }

  function bootstrapWithTimeout() {
    return Promise.race([
      apiGet('me.php', false, false, ME_FETCH_TIMEOUT_MS),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Session check timed out.')), BOOTSTRAP_TIMEOUT_MS);
      }),
    ]);
  }

  async function bootstrap() {
    const token = getToken();
    if (!token) {
      currentUser = null;
      subscription = null;
      supportAvailable = false;
      notify();
      return null;
    }
    try {
      const data = await bootstrapWithTimeout();
      if (applySessionData(data)) return currentUser;
    } catch (e) {
      if (e && typeof e === 'object' && e.status === 401) setToken(null);
    }
    currentUser = null;
    subscription = null;
    supportAvailable = false;
    notify();
    return null;
  }

  async function refreshProfile() {
    const token = getToken();
    if (!token) return null;
    try {
      const data = await apiGet('me.php', false, false, ME_FETCH_TIMEOUT_MS);
      if (applySessionData(data)) return currentUser;
    } catch {
      /* keep existing session on transient errors */
    }
    return currentUser;
  }

  function getUserStatus() {
    return currentUser?.status ? String(currentUser.status) : '';
  }

  function isVerificationLocked() {
    if (!currentUser) return false;
    const s = getUserStatus();
    return s === 'pending_verification' || s === 'declined';
  }

  function patchUser(fields) {
    if (!currentUser) return;
    currentUser = { ...currentUser, ...fields };
    notify();
  }

  function requireAuth(message) {
    if (!currentUser) {
      const msg = message || 'Sign in to use this feature.';
      if (confirm(`${msg}\n\nGo to sign in now?`)) {
        window.location.href = 'login.html';
      }
      return false;
    }
    if (isVerificationLocked()) return false;
    return true;
  }

  function getUser() {
    return currentUser;
  }

  function isLoggedIn() {
    return !!currentUser;
  }

  async function logout() {
    try {
      await global.WWC_API.apiPost('logout.php', {}, true);
    } catch {
      /* ignore */
    }
    setToken(null);
    currentUser = null;
    subscription = null;
    supportAvailable = false;
    notify();
  }

  global.WWC_AUTH = {
    bootstrap,
    refreshProfile,
    subscribe,
    requireAuth,
    getUser,
    isLoggedIn,
    isVerificationLocked,
    getUserStatus,
    patchUser,
    logout,
    getSubscription: () => subscription,
    getSupportEmail: () => supportEmail,
    isSupportAvailable: () => supportAvailable,
  };
})(window);

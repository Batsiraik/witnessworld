/**
 * Session bootstrap — mirrors mobile RootNavigator + DashboardScreen.
 */
(function (global) {
  const { apiGet, getToken, setToken } = global.WWC_API;

  const BOOTSTRAP_TIMEOUT_MS = 12_000;

  let currentUser = null;
  let subscription = null;
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

  function bootstrapWithTimeout() {
    return Promise.race([
      apiGet('me.php'),
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
      notify();
      return null;
    }
    try {
      const data = await bootstrapWithTimeout();
      if (data.ok && data.user) {
        currentUser = data.user;
        subscription = data.subscription ?? null;
        notify();
        return currentUser;
      }
    } catch (e) {
      if (e && typeof e === 'object' && e.status === 401) setToken(null);
    }
    currentUser = null;
    subscription = null;
    notify();
    return null;
  }

  function requireAuth(message) {
    if (currentUser) return true;
    const msg = message || 'Sign in to use this feature.';
    if (confirm(`${msg}\n\nGo to sign in now?`)) {
      window.location.href = 'login.html';
    }
    return false;
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
    notify();
  }

  global.WWC_AUTH = {
    bootstrap,
    subscribe,
    requireAuth,
    getUser,
    isLoggedIn,
    logout,
    getSubscription: () => subscription,
  };
})(window);

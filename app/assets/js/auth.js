/**
 * Session bootstrap — mirrors mobile RootNavigator + DashboardScreen.
 */
(function (global) {
  const { apiGet, getToken, setToken } = global.WWC_API;

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

  async function bootstrap() {
    const token = getToken();
    if (!token) {
      currentUser = null;
      subscription = null;
      notify();
      return null;
    }
    try {
      const data = await apiGet('me.php');
      if (data.ok && data.user) {
        currentUser = data.user;
        subscription = data.subscription ?? null;
        notify();
        return currentUser;
      }
    } catch (e) {
      if (e.status === 401) setToken(null);
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

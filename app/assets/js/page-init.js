(function (global) {
  async function initPage(opts) {
    const onReady = typeof opts?.onReady === 'function' ? opts.onReady : null;
    const authPage = !!opts?.authPage;
    const requireAuth = authPage ? false : opts?.requireAuth !== false;

    if (authPage) {
      document.body.classList.add('wwc-auth-page');
      await global.WWC_AUTH.bootstrap();
      if (global.WWC_AUTH.isLoggedIn()) {
        window.location.replace('index.html');
        return false;
      }
      if (onReady) await onReady();
      return true;
    }

    global.WWC_SHELL.mountShell();
    const bootstrapPromise = global.WWC_AUTH.bootstrap();

    if (requireAuth) {
      await bootstrapPromise;
      if (!global.WWC_AUTH.isLoggedIn()) {
        const path = window.location.pathname.split('/').pop() || 'index.html';
        const ret = encodeURIComponent(path + window.location.search);
        window.location.replace(`login.html?return=${ret}`);
        return false;
      }
      if (onReady) await onReady();
      return true;
    }

    void bootstrapPromise;
    if (onReady) void Promise.resolve().then(onReady);
    return true;
  }

  global.WWC_PAGE = { init: initPage };
})(window);

(function (global) {
  async function initPage(opts) {
    const onReady = typeof opts?.onReady === 'function' ? opts.onReady : null;
    const requireAuth = !!opts?.requireAuth;

    global.WWC_SHELL.mountShell();
    const bootstrapPromise = global.WWC_AUTH.bootstrap();

    if (onReady && !requireAuth) {
      void Promise.resolve().then(onReady);
    }

    if (requireAuth) {
      await bootstrapPromise;
      if (!global.WWC_AUTH.isLoggedIn()) {
        const ret = encodeURIComponent(
          window.location.pathname.split('/').pop() + window.location.search
        );
        window.location.replace(`login.html?return=${ret}`);
        return false;
      }
      if (onReady) await onReady();
      return true;
    }

    void bootstrapPromise;
    return true;
  }

  global.WWC_PAGE = { init: initPage };
})(window);

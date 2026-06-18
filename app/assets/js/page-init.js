(function (global) {
  async function initPage(opts) {
    const onReady = typeof opts?.onReady === 'function' ? opts.onReady : null;
    const requireAuth = !!opts?.requireAuth;

    global.WWC_SHELL.mountShell();

    const bootstrapPromise = global.WWC_AUTH.bootstrap();
    const contentPromise =
      onReady && !requireAuth ? Promise.resolve().then(onReady) : null;

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

    await Promise.all([bootstrapPromise, contentPromise || Promise.resolve()]);
    return true;
  }

  global.WWC_PAGE = { init: initPage };
})(window);

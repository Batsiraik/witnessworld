(function (global) {
  async function initPage(opts) {
    const onReady = typeof opts?.onReady === 'function' ? opts.onReady : null;
    const readyPromise =
      onReady && !opts?.requireAuth ? Promise.resolve().then(onReady) : null;

    await global.WWC_AUTH.bootstrap();
    global.WWC_SHELL.mountShell();
    if (opts?.requireAuth && !global.WWC_AUTH.isLoggedIn()) {
      const ret = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      window.location.replace(`login.html?return=${ret}`);
      return false;
    }
    if (onReady) {
      if (readyPromise) await readyPromise;
      else await onReady();
    }
    return true;
  }

  global.WWC_PAGE = { init: initPage };
})(window);

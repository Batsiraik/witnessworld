(function (global) {
  async function initPage(opts) {
    await global.WWC_AUTH.bootstrap();
    global.WWC_SHELL.mountShell();
    if (opts?.requireAuth && !global.WWC_AUTH.isLoggedIn()) {
      const ret = encodeURIComponent(window.location.pathname.split('/').pop() + window.location.search);
      window.location.replace(`login.html?return=${ret}`);
      return false;
    }
    if (typeof opts?.onReady === 'function') await opts.onReady();
    return true;
  }

  global.WWC_PAGE = { init: initPage };
})(window);

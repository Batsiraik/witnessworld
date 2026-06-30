(function () {
  const menuBtn = document.getElementById('menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('drawer-close');
  const navAuth = document.getElementById('wwc-nav-auth');
  const mobileAuth = document.getElementById('wwc-mobile-auth');

  function openDrawer() {
    drawer?.classList.add('is-open');
    drawer?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('is-open');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  document.querySelectorAll('[data-scroll]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-scroll') || el.getAttribute('href')?.slice(1);
      if (!target) return;
      const node = document.getElementById(target);
      if (!node) return;
      e.preventDefault();
      closeDrawer();
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', `#${target}`);
    });
  });

  drawer?.querySelectorAll('a[data-scroll]').forEach((a) => {
    a.addEventListener('click', closeDrawer);
  });

  function authHtml(loggedIn) {
    if (loggedIn) {
      return `<a href="app/index.html" class="wwc-btn wwc-btn-primary">Go to dashboard</a>`;
    }
    return `
      <a href="app/login.html" class="wwc-btn wwc-btn-ghost">Sign in</a>
      <a href="app/register.html" class="wwc-btn wwc-btn-primary">Join</a>`;
  }

  function mobileAuthHtml(loggedIn) {
    if (loggedIn) {
      return `<a href="app/index.html" style="color:#1590d4">Go to dashboard</a>`;
    }
    return `
      <a href="app/login.html">Sign in</a>
      <a href="app/register.html" style="color:#1590d4">Join</a>`;
  }

  function updateAuthUI() {
    const auth = window.WWC_AUTH;
    const loggedIn = auth?.isLoggedIn?.() ?? false;
    if (navAuth) navAuth.innerHTML = authHtml(loggedIn);
    if (mobileAuth) mobileAuth.innerHTML = mobileAuthHtml(loggedIn);

    document.querySelectorAll('[data-auth-when]').forEach((el) => {
      const when = el.getAttribute('data-auth-when');
      const show = when === 'logged-in' ? loggedIn : when === 'logged-out' ? !loggedIn : true;
      el.hidden = !show;
    });
  }

  updateAuthUI();

  if (window.WWC_AUTH) {
    void window.WWC_AUTH.bootstrap().then(updateAuthUI);
    window.WWC_AUTH.subscribe(updateAuthUI);
  }
})();

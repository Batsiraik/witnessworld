/**
 * App shell — bottom nav (mobile) + sticky top nav (desktop).
 */
(function (global) {
  const NAV_ITEMS = [
    { id: 'home', label: 'Home', href: 'index.html', icon: 'home-outline', match: /\/(index\.html)?$/ },
    { id: 'discover', label: 'Discover', href: 'discover.html', icon: 'search-outline', match: /discover/ },
    { id: 'post', label: 'Create', href: 'post.html', icon: 'add', fab: true },
    { id: 'inbox', label: 'Messages', href: 'messages.html', icon: 'chatbubble-outline', match: /messages/ },
    { id: 'profile', label: 'Profile', href: 'profile.html', icon: 'person-outline', match: /profile/ },
  ];

  function isActive(item) {
    if (!item.match) return false;
    return item.match.test(window.location.pathname);
  }

  function navLink(item, active) {
    if (item.fab) {
      return `
        <a href="${item.href}" class="wwc-nav-fab" aria-label="Create post or listing">
          <span class="wwc-nav-fab-ring"><ion-icon name="add" aria-hidden="true"></ion-icon></span>
        </a>`;
    }
    const cls = active ? 'wwc-nav-item is-active' : 'wwc-nav-item';
    return `
      <a href="${item.href}" class="${cls}" ${active ? 'aria-current="page"' : ''}>
        <ion-icon name="${item.icon}" aria-hidden="true"></ion-icon>
        <span>${item.label}</span>
      </a>`;
  }

  function renderTopNav() {
    const path = window.location.pathname;
    const homeActive = /\/app\/?$/.test(path) || path.endsWith('/index.html');
    return `
      <header class="wwc-topnav" role="banner">
        <div class="wwc-topnav-inner">
          <a href="index.html" class="wwc-topnav-brand">
            <img src="assets/images/logo.jpg" alt="" width="36" height="36" />
            <span>WWC</span>
          </a>
          <nav class="wwc-topnav-links" aria-label="Main">
            ${NAV_ITEMS.filter((i) => !i.fab)
              .map((item) => {
                const active = item.id === 'home' ? homeActive : isActive(item);
                return navLink(item, active);
              })
              .join('')}
            <a href="post.html" class="wwc-topnav-post" aria-label="Create post or listing">
              <ion-icon name="add" aria-hidden="true"></ion-icon>
              <span>Create</span>
            </a>
          </nav>
          <div class="wwc-topnav-auth" id="wwc-topnav-auth">
            <a href="login.html" class="wwc-btn wwc-btn-sm wwc-btn-primary">Sign in</a>
          </div>
        </div>
      </header>`;
  }

  function renderBottomNav() {
    return `
      <nav class="wwc-bottomnav" aria-label="Main">
        <div class="wwc-bottomnav-inner">
          ${NAV_ITEMS.map((item) => navLink(item, isActive(item))).join('')}
        </div>
      </nav>`;
  }

  function mountShell() {
    const top = document.getElementById('wwc-shell-top');
    const bottom = document.getElementById('wwc-shell-bottom');
    if (top) top.innerHTML = renderTopNav();
    if (bottom) bottom.innerHTML = renderBottomNav();
    updateAuthUI();
    global.WWC_AUTH.subscribe(updateAuthUI);
  }

  function updateAuthUI() {
    const el = document.getElementById('wwc-topnav-auth');
    if (!el) return;
    const user = global.WWC_AUTH.getUser();
    if (user) {
      const name = user.first_name || user.username || user.email || 'Account';
      el.innerHTML = `
        <a href="profile.html" class="wwc-topnav-user">${escapeHtml(name)}</a>
        <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" id="wwc-logout-btn">Sign out</button>`;
      const btn = document.getElementById('wwc-logout-btn');
      if (btn) {
        btn.addEventListener('click', async () => {
          await global.WWC_AUTH.logout();
          window.location.reload();
        });
      }
    } else {
      el.innerHTML = `<a href="login.html" class="wwc-btn wwc-btn-sm wwc-btn-primary">Sign in</a>`;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.WWC_SHELL = { mountShell };
})(window);

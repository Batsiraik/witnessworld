/**
 * App shell — bottom nav (mobile) + sticky top nav (desktop) + auth actions.
 */
(function (global) {
  const { apiGet, apiPost } = global.WWC_API;

  const NAV_ITEMS = [
    { id: 'home', label: 'Home', href: 'index.html', icon: 'home-outline', match: /\/(index\.html)?$/ },
    { id: 'discover', label: 'Discover', href: 'discover.html', icon: 'search-outline', match: /discover/ },
    { id: 'post', label: '+ Ad', href: 'post.html', icon: 'add', fab: true },
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
        <a href="${item.href}" class="wwc-nav-fab" data-shell-post aria-label="Post an ad">
          <span class="wwc-nav-fab-stack">
            <span class="wwc-nav-fab-ring"><ion-icon name="add" aria-hidden="true"></ion-icon></span>
            <span class="wwc-nav-fab-label">${item.label}</span>
          </span>
        </a>`;
    }
    const cls = active ? 'wwc-nav-item is-active' : 'wwc-nav-item';
    return `
      <a href="${item.href}" class="${cls}" ${active ? 'aria-current="page"' : ''}>
        <ion-icon name="${item.icon}" aria-hidden="true"></ion-icon>
        <span>${item.label}</span>
      </a>`;
  }

  function loggedInActionsHtml() {
    return `
      <div class="wwc-shell-quick-actions" role="group" aria-label="Quick links">
        <button type="button" class="wwc-icon-btn wwc-icon-btn-sm" data-shell-fav aria-label="Favorites">
          <ion-icon name="heart-outline" aria-hidden="true"></ion-icon>
        </button>
        <button type="button" class="wwc-icon-btn wwc-icon-btn-sm" data-shell-orders aria-label="My orders">
          <ion-icon name="receipt-outline" aria-hidden="true"></ion-icon>
        </button>
        <button type="button" class="wwc-icon-btn wwc-icon-btn-sm" data-shell-notif aria-label="Notifications">
          <ion-icon name="notifications-outline" aria-hidden="true"></ion-icon>
          <span class="wwc-badge-dot" data-shell-notif-badge hidden></span>
        </button>
      </div>`;
  }

  function authBlockHtml(user) {
    if (user) {
      const name = user.first_name || user.username || user.email || 'Account';
      return `
        ${loggedInActionsHtml()}
        <a href="profile.html" class="wwc-topnav-user">${escapeHtml(name)}</a>
        <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" data-shell-logout>Sign out</button>`;
    }
    return `
      <a href="login.html" class="wwc-btn wwc-btn-sm wwc-btn-ghost">Sign in</a>
      <a href="register.html" class="wwc-btn wwc-btn-sm wwc-btn-primary">Create account</a>`;
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
            <a href="post.html" class="wwc-topnav-post" data-shell-post aria-label="Post an ad">
              <ion-icon name="add" aria-hidden="true"></ion-icon>
              <span>+ Ad</span>
            </a>
          </nav>
          <div class="wwc-topnav-auth" id="wwc-topnav-auth"></div>
        </div>
      </header>
      <div class="wwc-mobile-auth" id="wwc-mobile-auth" aria-label="Account"></div>`;
  }

  function renderBottomNav() {
    return `
      <nav class="wwc-bottomnav" aria-label="Main">
        <div class="wwc-bottomnav-inner">
          ${NAV_ITEMS.map((item) => navLink(item, isActive(item))).join('')}
        </div>
      </nav>`;
  }

  function ensureNotifModal() {
    if (document.getElementById('shell-notif-modal')) return;
    document.body.insertAdjacentHTML(
      'beforeend',
      `
      <div class="wwc-modal-backdrop" id="shell-notif-modal" hidden>
        <div class="wwc-modal-sheet" role="dialog" aria-labelledby="shell-notif-modal-title">
          <h2 class="wwc-modal-title" id="shell-notif-modal-title">Notifications</h2>
          <div class="wwc-modal-list" id="shell-notif-list"></div>
          <button type="button" class="wwc-modal-done" data-shell-notif-close>Close</button>
        </div>
      </div>`
    );
    const modal = document.getElementById('shell-notif-modal');
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });
    modal?.querySelector('[data-shell-notif-close]')?.addEventListener('click', () => closeModal(modal));
  }

  function openModal(el) {
    el.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(el) {
    el.hidden = true;
    document.body.style.overflow = '';
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  }

  async function openNotifications() {
    if (!global.WWC_AUTH.requireAuth('Sign in to view notifications.')) return;
    ensureNotifModal();
    const modal = document.getElementById('shell-notif-modal');
    const list = document.getElementById('shell-notif-list');
    if (!modal || !list) return;
    openModal(modal);
    list.innerHTML = '<div class="wwc-loading"><div class="wwc-spinner"></div></div>';
    try {
      const data = await apiGet('user-notifications.php');
      const items = Array.isArray(data.notifications) ? data.notifications : [];
      if (!items.length) {
        list.innerHTML = '<p class="wwc-notif-empty">No notifications yet.</p>';
      } else {
        list.innerHTML = items
          .map((n) => {
            const unread = !n.is_read;
            return `
            <div class="wwc-notif-item${unread ? ' is-unread' : ''}">
              <div class="wwc-notif-title">${escapeHtml(n.title || 'Notification')}</div>
              <div class="wwc-notif-body">${escapeHtml(n.body || '')}</div>
              <div class="wwc-notif-time">${escapeHtml(formatTime(n.created_at))}</div>
            </div>`;
          })
          .join('');
      }
      try {
        await apiPost('user-notifications-read.php', {});
      } catch {
        /* ignore */
      }
      document.querySelectorAll('[data-shell-notif-badge]').forEach((el) => {
        el.hidden = true;
      });
    } catch (e) {
      list.innerHTML = `<p class="wwc-feed-error">${escapeHtml(e.message || 'Could not load notifications')}</p>`;
    }
  }

  async function refreshNotifBadge() {
    const badges = document.querySelectorAll('[data-shell-notif-badge]');
    if (!global.WWC_AUTH.isLoggedIn()) {
      badges.forEach((el) => {
        el.hidden = true;
      });
      return;
    }
    try {
      const data = await apiGet('user-notifications.php', true);
      const n = typeof data.unread_count === 'number' ? data.unread_count : 0;
      badges.forEach((el) => {
        el.hidden = n <= 0;
      });
    } catch {
      badges.forEach((el) => {
        el.hidden = true;
      });
    }
  }

  function bindAuthActions(root) {
    if (!root) return;
    root.querySelector('[data-shell-fav]')?.addEventListener('click', () => {
      if (!global.WWC_AUTH.requireAuth()) return;
      window.location.href = 'favorites.html';
    });
    root.querySelector('[data-shell-orders]')?.addEventListener('click', () => {
      if (!global.WWC_AUTH.requireAuth()) return;
      window.location.href = 'orders.html';
    });
    root.querySelector('[data-shell-notif]')?.addEventListener('click', () => {
      if (!global.WWC_AUTH.requireAuth('Sign in to view notifications.')) return;
      void openNotifications();
    });
    root.querySelector('[data-shell-logout]')?.addEventListener('click', async () => {
      await global.WWC_AUTH.logout();
      window.location.reload();
    });
  }

  function bindPostLinks() {
    document.querySelectorAll('[data-shell-post]').forEach((el) => {
      el.addEventListener('click', (e) => {
        if (!global.WWC_AUTH.isLoggedIn()) return;
        if (global.WWC_AUTH.isVerificationLocked()) e.preventDefault();
      });
    });
  }

  function ensureVerificationModule() {
    if (document.querySelector('script[data-wwc-verify]')) {
      global.WWC_VERIFY?.render?.();
      return;
    }
    const s = document.createElement('script');
    s.src = 'assets/js/verification-lock.js';
    s.dataset.wwcVerify = '1';
    s.onload = () => global.WWC_VERIFY?.init?.();
    document.body.appendChild(s);
  }

  function mountShell() {
    if (mountShell._mounted) return;
    mountShell._mounted = true;
    const top = document.getElementById('wwc-shell-top');
    const bottom = document.getElementById('wwc-shell-bottom');
    if (top) top.innerHTML = renderTopNav();
    if (bottom) bottom.innerHTML = renderBottomNav();
    ensureNotifModal();
    updateAuthUI();
    bindPostLinks();
    ensureVerificationModule();
    global.WWC_AUTH.subscribe(() => {
      updateAuthUI();
      bindPostLinks();
      global.WWC_VERIFY?.render?.();
    });
  }

  function updateAuthUI() {
    const user = global.WWC_AUTH.getUser();
    const html = authBlockHtml(user);
    const desktop = document.getElementById('wwc-topnav-auth');
    const mobile = document.getElementById('wwc-mobile-auth');
    if (desktop) {
      desktop.innerHTML = html;
      bindAuthActions(desktop);
    }
    if (mobile) {
      mobile.innerHTML = html;
      bindAuthActions(mobile);
    }
    setTimeout(() => void refreshNotifBadge(), 1500);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  global.WWC_SHELL = { mountShell, refreshNotifBadge };
})(window);

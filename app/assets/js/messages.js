(function () {
  const { apiGet, resolveMediaUrl } = WWC_API;
  const { escapeHtml, escapeAttr, formatRelative } = WWC_UTIL;
  const list = document.getElementById('msg-list');
  const pills = document.getElementById('msg-pills');
  let view = 'all';

  function avatarHtml(peer) {
    const label = peer.label || peer.username || 'Member';
    const url = peer.avatar_url ? resolveMediaUrl(peer.avatar_url) : null;
    if (url) {
      return `<div class="wwc-inbox-avatar"><img src="${escapeAttr(url)}" alt="" /></div>`;
    }
    const initial = (label.trim()[0] || '?').toUpperCase();
    return `<div class="wwc-inbox-avatar" aria-hidden="true">${escapeHtml(initial)}</div>`;
  }

  function threadCard(r) {
    const peer = r.peer || {};
    const unread = (r.unread_count || 0) > 0;
    const unreadCount = r.unread_count || 0;
    return `
      <a href="chat.html?conversation_id=${r.id}&peer_user_id=${peer.user_id || 0}&username=${encodeURIComponent(peer.username || '')}&context_key=${encodeURIComponent(r.context_key || '')}" class="wwc-inbox-thread${unread ? ' is-unread' : ''}">
        ${avatarHtml(peer)}
        <div class="wwc-inbox-body">
          <div class="wwc-inbox-top">
            <span class="wwc-inbox-name">${escapeHtml(peer.label || peer.username || 'Member')}</span>
            <span class="wwc-inbox-time">${escapeHtml(formatRelative(r.updated_at) || '')}</span>
          </div>
          <p class="wwc-inbox-preview">${escapeHtml(r.last_message || 'No messages yet')}</p>
        </div>
        ${unreadCount > 0 ? `<span class="wwc-inbox-badge" aria-label="${unreadCount} unread">${unreadCount > 9 ? '9+' : unreadCount}</span>` : ''}
      </a>`;
  }

  function emptyHtml() {
    return `
      <div class="wwc-inbox-empty">
        <ion-icon name="chatbubbles-outline" aria-hidden="true"></ion-icon>
        <p>No conversations yet</p>
        <small>Message a seller from a listing or product page — your threads will show up here.</small>
      </div>`;
  }

  async function load() {
    WWC_UTIL.showLoading(list);
    try {
      const data = await apiGet(`conversations-list.php?view=${view}`);
      const rows = Array.isArray(data.conversations) ? data.conversations : [];
      list.innerHTML = rows.length ? rows.map(threadCard).join('') : emptyHtml();
    } catch (e) {
      WWC_UTIL.showError(list, e.message, load);
    }
  }

  function renderPills() {
    const opts = [
      { id: 'all', label: 'All' },
      { id: 'unread', label: 'Unread' },
      { id: 'archived', label: 'Archived' },
    ];
    pills.innerHTML = opts
      .map((o) => `<button type="button" class="wwc-pill${o.id === view ? ' is-active' : ''}" data-v="${o.id}">${o.label}</button>`)
      .join('');
    pills.querySelectorAll('[data-v]').forEach((btn) => {
      btn.addEventListener('click', () => {
        view = btn.getAttribute('data-v');
        renderPills();
        void load();
      });
    });
  }

  WWC_PAGE.init({
    requireAuth: true,
    onReady: async () => {
      renderPills();
      await load();
    },
  });
})();

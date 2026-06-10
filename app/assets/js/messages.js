(function () {
  const { apiGet } = WWC_API;
  const { escapeHtml, formatRelative } = WWC_UTIL;
  const list = document.getElementById('msg-list');
  const pills = document.getElementById('msg-pills');
  let view = 'all';

  async function load() {
    WWC_UTIL.showLoading(list);
    try {
      const data = await apiGet(`conversations-list.php?view=${view}`);
      const rows = Array.isArray(data.conversations) ? data.conversations : [];
      list.innerHTML = rows.length
        ? rows.map((r) => {
            const peer = r.peer || {};
            const unread = (r.unread_count || 0) > 0;
            return `
              <a href="chat.html?conversation_id=${r.id}" class="wwc-card" style="display:flex;gap:12px;padding:14px;align-items:center${unread ? ';border:1px solid rgba(90,95,225,0.25)' : ''}">
                <div style="width:48px;height:48px;border-radius:50%;background:var(--wwc-primary-soft);display:flex;align-items:center;justify-content:center;font-weight:800;color:var(--wwc-primary-dark)">
                  ${escapeHtml((peer.label || peer.username || '?')[0] || '?')}
                </div>
                <div style="flex:1;min-width:0">
                  <div style="display:flex;justify-content:space-between;gap:8px">
                    <span style="font-weight:800">${escapeHtml(peer.label || peer.username || 'Member')}</span>
                    <span style="font-size:11px;color:var(--wwc-text-muted);font-weight:600">${escapeHtml(formatRelative(r.updated_at))}</span>
                  </div>
                  <p style="margin:4px 0 0;font-size:13px;color:var(--wwc-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600">${escapeHtml(r.last_message || 'No messages yet')}</p>
                </div>
                ${unread ? `<span class="wwc-badge-dot" style="position:static;width:10px;height:10px"></span>` : ''}
              </a>`;
          }).join('')
        : '<p class="wwc-empty">No conversations yet. Message a seller from a listing.</p>';
    } catch (e) {
      WWC_UTIL.showError(list, e.message, load);
    }
  }

  function renderPills() {
    const opts = [{ id: 'all', label: 'All' }, { id: 'unread', label: 'Unread' }, { id: 'archived', label: 'Archived' }];
    pills.innerHTML = opts.map((o) => `<button type="button" class="wwc-pill${o.id === view ? ' is-active' : ''}" data-v="${o.id}">${o.label}</button>`).join('');
    pills.querySelectorAll('[data-v]').forEach((btn) => {
      btn.addEventListener('click', () => { view = btn.getAttribute('data-v'); renderPills(); load(); });
    });
  }

  WWC_PAGE.init({ requireAuth: true, onReady: async () => { renderPills(); await load(); } });
})();

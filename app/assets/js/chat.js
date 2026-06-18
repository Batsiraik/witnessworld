(function () {
  const cid = WWC_UTIL.qsInt('conversation_id');
  const peerUserId = WWC_UTIL.qsInt('peer_user_id');
  const peerUsername = WWC_UTIL.qs('username') || '';
  const contextKey = WWC_UTIL.qs('context_key') || '';
  const { apiGet, apiPost } = WWC_API;
  const { escapeHtml, formatTime } = WWC_UTIL;
  const list = document.getElementById('chat-messages');
  const form = document.getElementById('chat-form');
  const input = document.getElementById('chat-input');
  const title = document.getElementById('chat-title');
  const hireBtn = document.getElementById('chat-hire-btn');

  const showHire = peerUserId > 0 && !/^product:/.test(contextKey) && !/^store:/.test(contextKey);

  if (hireBtn) {
    if (showHire) {
      hireBtn.hidden = false;
      hireBtn.href = `hire.html?peer_user_id=${peerUserId}&username=${encodeURIComponent(peerUsername)}`;
    } else {
      hireBtn.hidden = true;
    }
  }

  async function load() {
    if (!cid) {
      list.innerHTML = '<p class="wwc-empty">Invalid conversation.</p>';
      return;
    }
    try {
      const data = await apiGet(`messages.php?conversation_id=${cid}`);
      const msgs = Array.isArray(data.messages) ? data.messages : [];
      if (data.peer?.label) title.textContent = data.peer.label;
      else if (data.peer?.username) title.textContent = data.peer.username;
      else if (peerUsername) title.textContent = peerUsername;
      list.innerHTML = msgs.length
        ? msgs.map((m) => `
            <div style="display:flex;${m.mine ? 'justify-content:flex-end' : 'justify-content:flex-start'};margin-bottom:10px">
              <div style="max-width:80%;padding:10px 14px;border-radius:14px;font-size:14px;font-weight:600;line-height:1.45;${m.mine ? 'background:var(--wwc-tab-active);color:#fff;border-bottom-right-radius:4px' : 'background:#fff;border:1px solid var(--wwc-line);border-bottom-left-radius:4px'}">
                ${escapeHtml(m.body || '')}
                <div style="font-size:10px;opacity:0.75;margin-top:4px">${escapeHtml(formatTime(m.created_at))}</div>
              </div>
            </div>`).join('')
        : '<p class="wwc-empty">Say hello to start the conversation.</p>';
      list.scrollTop = list.scrollHeight;
      try { await apiPost('conversation-mark-read.php', { conversation_id: cid }); } catch { /* */ }
    } catch (e) {
      list.innerHTML = `<p class="wwc-feed-error">${escapeHtml(e.message)}</p>`;
    }
  }

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = input.value.trim();
    if (!body) return;
    input.disabled = true;
    try {
      await apiPost('message-send.php', { conversation_id: cid, body });
      input.value = '';
      await load();
    } catch (ex) {
      alert(ex.message);
    } finally {
      input.disabled = false;
      input.focus();
    }
  });

  WWC_PAGE.init({ requireAuth: true, onReady: load });
})();

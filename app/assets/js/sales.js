(function () {
  const { apiGet, apiPost } = WWC_API;
  const { escapeHtml, formatTime } = WWC_UTIL;
  const F = WWC_COMMERCE;
  const list = document.getElementById('sales-list');

  async function quickAction(requestId, action, e) {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'decline' && !confirm('Decline this request?')) return;
    try {
      await apiPost('commerce-request-action.php', { request_id: requestId, action });
      await load();
    } catch (ex) {
      alert(ex.message);
    }
  }

  async function load() {
    WWC_UTIL.showLoading(list);
    try {
      const data = await apiGet('commerce-requests-list.php?role=seller');
      const rows = Array.isArray(data.requests) ? data.requests : [];
      list.innerHTML = rows.length
        ? rows.map((r) => {
            const status = F.statusLabel(r.status);
            const quick = r.status === 'new'
              ? `<div style="display:flex;gap:8px;margin-top:10px" onclick="event.stopPropagation()">
                  <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-primary" data-act="accept" data-id="${r.id}">Accept</button>
                  <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" data-act="decline" data-id="${r.id}">Decline</button>
                </div>`
              : '';
            return `
              <a href="order.html?id=${r.id}&from=sales" class="wwc-card" style="display:block;padding:16px">
                <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">
                  <span style="font-weight:800">${escapeHtml(r.subject_title || 'Request')}</span>
                  <span class="wwc-order-status">${escapeHtml(status)}</span>
                </div>
                <p style="margin:0;font-size:13px;color:var(--wwc-text-muted);font-weight:600">Buyer: ${escapeHtml(r.buyer_label || '')}</p>
                <p style="margin:4px 0 0;font-size:12px;color:var(--wwc-text-muted)">${escapeHtml(formatTime(r.created_at))}</p>
                ${quick}
              </a>`;
          }).join('')
        : '<p class="wwc-empty">No incoming requests yet.</p>';

      list.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          quickAction(Number(btn.getAttribute('data-id')), btn.getAttribute('data-act'), e);
        });
      });
    } catch (e) {
      WWC_UTIL.showError(list, e.message, load);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: load });
})();

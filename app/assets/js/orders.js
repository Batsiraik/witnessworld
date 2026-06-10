(function () {
  const { apiGet } = WWC_API;
  const { escapeHtml, formatTime } = WWC_UTIL;
  const list = document.getElementById('orders-list');

  async function load() {
    WWC_UTIL.showLoading(list);
    try {
      const data = await apiGet('commerce-requests-list.php?role=buyer');
      const rows = Array.isArray(data.requests) ? data.requests : [];
      list.innerHTML = rows.length
        ? rows.map((r) => `
            <a href="order.html?id=${r.id}" class="wwc-card" style="display:block;padding:16px">
              <div style="display:flex;justify-content:space-between;gap:8px;margin-bottom:6px">
                <span style="font-weight:800">${escapeHtml(r.subject_title || 'Order')}</span>
                <span class="wwc-detail-tag">${escapeHtml(String(r.status || '').replace(/_/g, ' '))}</span>
              </div>
              <p style="margin:0;font-size:13px;color:var(--wwc-text-muted);font-weight:600">Seller: ${escapeHtml(r.seller_label || '')}</p>
              <p style="margin:4px 0 0;font-size:12px;color:var(--wwc-text-muted)">${escapeHtml(formatTime(r.created_at))}</p>
            </a>`).join('')
        : '<p class="wwc-empty">No orders yet.</p>';
    } catch (e) {
      WWC_UTIL.showError(list, e.message, load);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: load });
})();

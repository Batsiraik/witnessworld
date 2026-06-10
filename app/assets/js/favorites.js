(function () {
  const { apiGet } = WWC_API;
  const { resolveMediaUrl } = WWC_API;
  const { escapeHtml } = WWC_UTIL;
  const grid = document.getElementById('fav-grid');

  function href(item) {
    if (item.subject_type === 'product') return `product.html?id=${item.subject_id}`;
    if (item.subject_type === 'store') return `store.html?id=${item.subject_id}`;
    if (item.subject_type === 'directory_entry') return `directory-entry.html?id=${item.subject_id}`;
    return `listing.html?id=${item.subject_id}`;
  }

  function typeLabel(t) {
    if (t === 'product') return 'Product';
    if (t === 'store') return 'Store';
    if (t === 'directory_entry') return 'Business';
    return 'Listing';
  }

  async function load() {
    WWC_UTIL.showLoading(grid);
    try {
      const data = await apiGet('favorites-list.php');
      const rows = Array.isArray(data.favorites) ? data.favorites : [];
      grid.innerHTML = rows.length
        ? rows.map((item) => {
            const img = resolveMediaUrl(item.image_url);
            return `
              <a href="${href(item)}" class="wwc-card" style="display:flex;gap:12px;padding:12px;align-items:center">
                <div style="width:72px;height:72px;border-radius:12px;overflow:hidden;flex-shrink:0;background:var(--wwc-primary-soft)">
                  ${img ? `<img src="${WWC_UTIL.escapeAttr(img)}" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
                </div>
                <div style="min-width:0">
                  <span class="wwc-detail-tag">${typeLabel(item.subject_type)}</span>
                  <p class="wwc-card-title" style="margin:6px 0 2px;padding:0">${escapeHtml(item.title || '')}</p>
                  <p class="wwc-card-meta" style="margin:0;padding:0">${escapeHtml(item.subtitle || item.meta || '')}</p>
                </div>
              </a>`;
          }).join('')
        : '<p class="wwc-empty">No favorites yet. Tap the heart on listings you like.</p>';
    } catch (e) {
      WWC_UTIL.showError(grid, e.message, load);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: load });
})();

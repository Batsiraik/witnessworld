(function () {
  const { apiGet } = WWC_API;
  const { storeCard } = WWC_CARDS;
  const { showLoading, showError } = WWC_UTIL;
  const els = { grid: document.getElementById('browse-grid'), search: document.getElementById('browse-search'), catSelect: document.getElementById('browse-category'), applyBtn: document.getElementById('browse-apply') };
  let categories = [];
  let filterCatId = '';
  let appliedQ = '';
  const loc = WWC_LOC.create({ onChange: () => load(), labelId: 'loc-label', btnId: 'loc-btn' });

  async function loadCategories() {
    try {
      const data = await apiGet('store-categories.php', true);
      categories = Array.isArray(data.categories) ? data.categories : [];
      if (els.catSelect) {
        els.catSelect.innerHTML = '<option value="">All categories</option>' + categories.map((c) => `<option value="${c.id}">${WWC_UTIL.escapeHtml(c.name)}</option>`).join('');
      }
    } catch { /* */ }
  }

  async function load() {
    showLoading(els.grid);
    const p = new URLSearchParams({ limit: '50' });
    if (filterCatId) p.set('category_id', filterCatId);
    const country = loc.getCountry();
    const state = loc.getState();
    if (country?.code) p.set('country', country.code);
    if (state?.name) p.set('us_state', state.name);
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    try {
      const data = await apiGet(`marketplace-stores.php?${p}`, true);
      const rows = Array.isArray(data.stores) ? data.stores : [];
      els.grid.innerHTML = rows.length ? rows.map((r) => storeCard(r)).join('') : '<p class="wwc-empty">No stores found.</p>';
    } catch (e) {
      showError(els.grid, e.message, load);
    }
  }

  WWC_PAGE.init({
    onReady: async () => {
      loc.bind();
      await loc.loadLocations();
      loc.updateLabel();
      await loadCategories();
      els.search?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { appliedQ = els.search.value; load(); } });
      els.applyBtn?.addEventListener('click', () => { filterCatId = els.catSelect?.value || ''; appliedQ = els.search?.value || ''; load(); });
      await load();
    },
  });
})();

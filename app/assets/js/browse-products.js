(function () {
  const { apiGet } = WWC_API;
  const { productCard } = WWC_CARDS;
  const { showLoading, showError } = WWC_UTIL;
  const els = { grid: document.getElementById('browse-grid'), search: document.getElementById('browse-search'), applyBtn: document.getElementById('browse-apply'), priceMin: document.getElementById('price-min'), priceMax: document.getElementById('price-max') };
  let appliedQ = '';
  let priceMin = '';
  let priceMax = '';

  const loc = WWC_LOC.create({ onChange: () => load(), labelId: 'loc-label', btnId: 'loc-btn' });

  async function load() {
    showLoading(els.grid);
    const p = new URLSearchParams({ limit: '50' });
    const country = loc.getCountry();
    const state = loc.getState();
    if (country?.code) p.set('country', country.code);
    if (state?.name) p.set('us_state', state.name);
    if (priceMin.trim()) p.set('price_min', priceMin.trim());
    if (priceMax.trim()) p.set('price_max', priceMax.trim());
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    try {
      const data = await apiGet(`marketplace-products.php?${p}`, true);
      const rows = Array.isArray(data.products) ? data.products : [];
      els.grid.innerHTML = rows.length ? rows.map((r) => productCard(r)).join('') : '<p class="wwc-empty">No products found.</p>';
    } catch (e) {
      showError(els.grid, e.message, load);
    }
  }

  WWC_PAGE.init({
    onReady: async () => {
      loc.bind();
      await loc.loadLocations();
      loc.updateLabel();
      els.search?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { appliedQ = els.search.value; load(); } });
      els.applyBtn?.addEventListener('click', () => { priceMin = els.priceMin?.value || ''; priceMax = els.priceMax?.value || ''; appliedQ = els.search?.value || ''; load(); });
      await load();
    },
  });
})();

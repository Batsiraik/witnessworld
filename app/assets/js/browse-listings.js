(function () {
  const CONFIG = {
    service: { title: 'Services', catApi: 'service-categories.php', type: 'service' },
    classified: { title: 'Classifieds', catApi: 'marketplace-categories.php', type: 'classified' },
    community: { title: 'Community', catApi: 'community-categories.php', type: 'community' },
  };

  const pageType = document.body.dataset.browseType || 'service';
  const cfg = CONFIG[pageType] || CONFIG.service;
  const { apiGet } = WWC_API;
  const { qs } = WWC_UTIL;
  const { listingCard } = WWC_CARDS;
  const { showLoading, showError } = WWC_UTIL;

  let categories = [];
  let filterCatId = '';
  let priceMin = '';
  let priceMax = '';
  let appliedQ = qs('q') || '';

  const els = {
    grid: document.getElementById('browse-grid'),
    search: document.getElementById('browse-search'),
    catSelect: document.getElementById('browse-category'),
    priceMin: document.getElementById('price-min'),
    priceMax: document.getElementById('price-max'),
    applyBtn: document.getElementById('browse-apply'),
  };

  const loc = WWC_LOC.create({
    onChange: () => load(),
    labelId: 'loc-label',
    btnId: 'loc-btn',
  });

  async function loadCategories() {
    try {
      const data = await apiGet(cfg.catApi, true);
      categories = Array.isArray(data.categories) ? data.categories : [];
      if (els.catSelect) {
        els.catSelect.innerHTML =
          '<option value="">All categories</option>' +
          categories.map((c) => `<option value="${c.id}">${WWC_UTIL.escapeHtml(c.name)}</option>`).join('');
      }
    } catch {
      /* optional */
    }
  }

  async function load() {
    showLoading(els.grid);
    const p = new URLSearchParams();
    p.set('listing_type', cfg.type);
    if (filterCatId) p.set('category_id', filterCatId);
    const country = loc.getCountry();
    const state = loc.getState();
    if (country?.code) p.set('country', country.code);
    if (state?.name) p.set('us_state', state.name);
    if (priceMin.trim()) p.set('price_min', priceMin.trim());
    if (priceMax.trim()) p.set('price_max', priceMax.trim());
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    p.set('limit', '50');
    try {
      const data = await apiGet(`marketplace-listings.php?${p}`, true);
      const rows = Array.isArray(data.listings) ? data.listings : [];
      els.grid.innerHTML = rows.length
        ? rows.map((r) => listingCard(r, 'listing.html')).join('')
        : '<p class="wwc-empty">No listings found. Try adjusting filters.</p>';
    } catch (e) {
      showError(els.grid, e.message, load);
    }
  }

  function bind() {
    if (els.search) {
      els.search.value = appliedQ;
      els.search.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          appliedQ = els.search.value;
          load();
        }
      });
    }
    els.applyBtn?.addEventListener('click', () => {
      filterCatId = els.catSelect?.value || '';
      priceMin = els.priceMin?.value || '';
      priceMax = els.priceMax?.value || '';
      appliedQ = els.search?.value || '';
      load();
    });
    loc.bind();
  }

  WWC_PAGE.init({
    onReady: async () => {
      document.title = `${cfg.title} · Witness World Connect`;
      const titleEl = document.getElementById('page-title');
      if (titleEl) titleEl.textContent = cfg.title;
      bind();
      await loc.loadLocations();
      loc.updateLabel();
      await loadCategories();
      await load();
    },
  });
})();

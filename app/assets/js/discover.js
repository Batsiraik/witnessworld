(function () {
  const PILLS = [
    { id: 'all', label: 'All', section: 'all' },
    { id: 'marketplace', label: 'Marketplace', section: 'marketplace' },
    { id: 'services', label: 'Services', section: 'services' },
    { id: 'community', label: 'Community', section: 'community' },
    { id: 'stores', label: 'Stores', section: 'stores' },
    { id: 'businesses', label: 'Businesses', section: 'businesses' },
  ];

  const { apiGet } = WWC_API;
  const { gridCard } = WWC_CARDS;
  const { showLoading, showError } = WWC_UTIL;

  let activePill = 'all';
  let clientQ = '';
  const els = { grid: document.getElementById('discover-grid'), pills: document.getElementById('discover-pills'), search: document.getElementById('discover-search') };
  const loc = WWC_LOC.create({ onChange: () => load(), labelId: 'loc-label', btnId: 'loc-btn' });

  function normalizeItems(feed, pill) {
    const items = [];
    const push = (kind, row, created) => items.push({ kind, row, created: created || '' });

    if (pill === 'all' || pill === 'services') (feed.services || []).forEach((r) => push('service', r, r.created_at));
    if (pill === 'all' || pill === 'marketplace') {
      (feed.classifieds || []).forEach((r) => push('classified', r, r.created_at));
      (feed.products || []).forEach((r) => push('product', r, r.created_at));
    }
    if (pill === 'all' || pill === 'community') (feed.community || []).forEach((r) => push('community', r, r.created_at));
    if (pill === 'all' || pill === 'stores') (feed.stores || []).forEach((r) => push('store', r, r.created_at));
    if (pill === 'all' || pill === 'businesses') (feed.directory || []).forEach((r) => push('directory', r, r.created_at));

    items.sort((a, b) => (b.created || '').localeCompare(a.created || ''));
    return items;
  }

  async function fetchFeed(pill) {
    const country = loc.getCountry();
    const state = loc.getState();
    const base = { limit: '24' };
    if (country?.code) base.country = country.code;
    if (state?.name) base.us_state = state.name;

    if (pill === 'marketplace') {
      const [c, p] = await Promise.all([
        apiGet(`marketplace-home-feed.php?${new URLSearchParams({ ...base, section: 'classifieds' })}`, true),
        apiGet(`marketplace-home-feed.php?${new URLSearchParams({ ...base, section: 'products' })}`, true),
      ]);
      return { classifieds: c.feed?.classifieds || [], products: c.feed?.products || p.feed?.products || [] };
    }

    const section = pill === 'businesses' ? 'directory' : pill === 'all' ? 'all' : pill;
    const data = await apiGet(`marketplace-home-feed.php?${new URLSearchParams({ ...base, section })}`, true);
    return data.feed || {};
  }

  async function load() {
    showLoading(els.grid);
    try {
      const feed = await fetchFeed(activePill);
      let items = normalizeItems(feed, activePill);
      const q = clientQ.trim().toLowerCase();
      if (q) {
        items = items.filter(({ kind, row }) => {
          const title = kind === 'product' ? row.name : kind === 'store' ? row.name : kind === 'directory' ? row.business_name : row.title;
          return String(title || '').toLowerCase().includes(q);
        });
      }
      els.grid.innerHTML = items.length
        ? items.map(({ kind, row }) => gridCard(row, kind === 'classified' || kind === 'service' || kind === 'community' ? 'listing' : kind)).join('')
        : '<p class="wwc-empty">Nothing found. Try another filter or location.</p>';
    } catch (e) {
      showError(els.grid, e.message, load);
    }
  }

  function renderPills() {
    els.pills.innerHTML = PILLS.map((p) =>
      `<button type="button" class="wwc-pill${p.id === activePill ? ' is-active' : ''}" data-pill="${p.id}">${p.label}</button>`
    ).join('');
    els.pills.querySelectorAll('[data-pill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        activePill = btn.getAttribute('data-pill');
        renderPills();
        load();
      });
    });
  }

  WWC_PAGE.init({
    onReady: async () => {
      renderPills();
      loc.bind();
      await loc.loadLocations();
      loc.updateLabel();
      els.search?.addEventListener('input', () => { clientQ = els.search.value; load(); });
      await load();
    },
  });
})();

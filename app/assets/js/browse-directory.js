(function () {
  const { apiGet } = WWC_API;
  const { directoryCard } = WWC_CARDS;
  const { showLoading, showError } = WWC_UTIL;
  const els = {
    grid: document.getElementById('browse-grid'),
    search: document.getElementById('browse-search'),
    catSelect: document.getElementById('browse-category'),
    applyBtn: document.getElementById('browse-apply'),
    hint: document.getElementById('dir-hint'),
  };
  let categories = [];
  let filterCatId = '';
  let appliedQ = '';

  const loc = WWC_LOC.create({
    onChange: () => {
      updateHint();
      load();
    },
    labelId: 'loc-label',
    btnId: 'loc-btn',
  });

  function updateHint() {
    if (!els.hint) return;
    const country = loc.getCountry();
    els.hint.textContent = country
      ? `Showing businesses in ${country.name}${loc.getState()?.name ? `, ${loc.getState().name}` : ''}.`
      : 'Showing businesses worldwide. Use location to narrow results.';
  }

  async function loadCategories() {
    try {
      const data = await apiGet('directory-categories.php', true);
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
    const country = loc.getCountry();
    if (country?.code) p.set('country', country.code);
    const state = loc.getState();
    if (state?.name) p.set('us_state', state.name);
    if (filterCatId) p.set('category_id', filterCatId);
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    try {
      const data = await apiGet(`directory-list.php?${p}`, true);
      const rows = Array.isArray(data.entries) ? data.entries : [];
      els.grid.innerHTML = rows.length
        ? rows.map((r) => directoryCard(r)).join('')
        : '<p class="wwc-empty">No businesses found.</p>';
    } catch (e) {
      showError(els.grid, e.message, load);
    }
  }

  WWC_PAGE.init({
    onReady: async () => {
      loc.bind();
      await loc.loadLocations();
      loc.updateLabel();
      updateHint();
      await loadCategories();
      els.search?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          appliedQ = els.search.value;
          load();
        }
      });
      els.applyBtn?.addEventListener('click', () => {
        filterCatId = els.catSelect?.value || '';
        appliedQ = els.search?.value || '';
        load();
      });
      await load();
    },
  });
})();

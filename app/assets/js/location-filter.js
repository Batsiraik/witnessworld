(function (global) {
  const { escapeHtml } = global.WWC_UTIL;

  function createLocationFilter(opts) {
    let countries = [];
    let usStates = [];
    let country = null;
    let usState = null;
    let onChange = opts.onChange || (() => {});

    const modal = document.getElementById(opts.modalId || 'loc-modal');
    const labelEl = document.getElementById(opts.labelId || 'loc-label');
    const btn = document.getElementById(opts.btnId || 'loc-btn');
    const searchEl = document.getElementById(opts.searchId || 'loc-country-search');
    const countryList = document.getElementById(opts.countryListId || 'loc-country-list');
    const stateSection = document.getElementById(opts.stateSectionId || 'loc-state-section');
    const stateList = document.getElementById(opts.stateListId || 'loc-state-list');

    function label() {
      if (!country) return 'All locations';
      if (country.code === 'US' && usState) return `${usState.name}, ${country.name}`;
      return country.name;
    }

    function updateLabel() {
      if (labelEl) labelEl.textContent = label();
    }

    function open() {
      if (!modal) return;
      renderCountries(searchEl?.value || '');
      renderStates();
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }

    function close() {
      if (!modal) return;
      modal.hidden = true;
      document.body.style.overflow = '';
    }

    function renderCountries(filter) {
      if (!countryList) return;
      const q = (filter || '').trim().toLowerCase();
      const list = q
        ? countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
        : countries;
      countryList.innerHTML = list
        .map((c) => `<button type="button" class="wwc-modal-row" data-code="${c.code}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</button>`)
        .join('');
      countryList.querySelectorAll('[data-code]').forEach((el) => {
        el.addEventListener('click', () => {
          country = countries.find((c) => c.code === el.getAttribute('data-code')) || null;
          usState = null;
          updateLabel();
          renderStates();
          if (country?.code !== 'US') {
            close();
            onChange(country, usState);
          }
        });
      });
    }

    function renderStates() {
      if (!stateSection || !stateList) return;
      if (country?.code !== 'US') {
        stateSection.hidden = true;
        return;
      }
      stateSection.hidden = false;
      const items = [{ code: '', name: 'All states' }, ...usStates];
      stateList.innerHTML = items
        .map((s, i) => `<button type="button" class="wwc-modal-row" data-idx="${i}">${escapeHtml(s.name)}</button>`)
        .join('');
      stateList.querySelectorAll('[data-idx]').forEach((el) => {
        el.addEventListener('click', () => {
          const idx = Number(el.getAttribute('data-idx'));
          usState = idx === 0 ? null : usStates[idx - 1];
          updateLabel();
          close();
          onChange(country, usState);
        });
      });
    }

    async function loadLocations() {
      try {
        const data = await global.WWC_API.apiGet('locations.php', true);
        if (Array.isArray(data.countries)) countries = data.countries;
        if (Array.isArray(data.us_states)) usStates = data.us_states;
      } catch {
        /* optional */
      }
    }

    function bind() {
      btn?.addEventListener('click', open);
      searchEl?.addEventListener('input', () => renderCountries(searchEl.value));
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) close();
      });
      modal?.querySelector('[data-loc-all]')?.addEventListener('click', () => {
        country = null;
        usState = null;
        updateLabel();
        close();
        onChange(country, usState);
      });
      modal?.querySelector('[data-loc-done]')?.addEventListener('click', close);
    }

    return {
      loadLocations,
      bind,
      updateLabel,
      getCountry: () => country,
      getState: () => usState,
      setCountry: (c) => {
        country = c;
        updateLabel();
      },
      setState: (s) => {
        usState = s;
        updateLabel();
      },
    };
  }

  global.WWC_LOC = { create: createLocationFilter };
})(window);

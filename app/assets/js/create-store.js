(function () {
  const { apiPost, apiGet } = WWC_API;
  const { escapeHtml } = WWC_UTIL;
  const C = WWC_CREATE;
  const root = document.getElementById('create-root');

  const state = {
    logoUrl: null,
    bannerUrl: null,
    countries: [],
    usStates: [],
    usCode: 'US',
    categories: [],
  };

  function renderForm() {
    const user = WWC_AUTH.getUser();
    if (!C.hasAvatar(user)) {
      root.innerHTML = C.avatarGateHtml();
      return;
    }

    const deliveryOpts = C.DELIVERY_OPTIONS.map(
      (d) => `<option value="${d.value}"${d.value === 'worldwide' ? ' selected' : ''}>${escapeHtml(d.label)} — ${escapeHtml(d.sub)}</option>`
    ).join('');

    root.innerHTML = `
      <div class="wwc-create-form">
        <span class="wwc-create-pill">Online store</span>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">Launch Your Storefront</h1>
        <p class="wwc-create-lead">Establish a permanent retail presence — sell new, shippable products from a dedicated storefront.</p>

        <form id="store-form">
          <div class="wwc-create-section">
            <h2>Store info</h2>
            <div class="wwc-create-field"><label for="name">Store name *</label><input id="name" required placeholder="e.g. Cedar Wood Crafts" /></div>
            <div class="wwc-create-field"><label for="sells">What you sell (short line) *</label><input id="sells" required placeholder="e.g. Handmade cutting boards & kitchenware" /></div>
            <div class="wwc-create-field"><label for="description">About your store *</label><textarea id="description" required placeholder="Story, policies, what makes your shop special…"></textarea></div>
            <div class="wwc-create-field"><label for="category">Category</label>${C.categorySelectHtml(state.categories, '', 'category')}</div>
          </div>

          <div class="wwc-create-section">
            <h2>Branding</h2>
            ${mediaField('logo', 'Store logo *', 'Required · square works best')}
            ${mediaField('banner', 'Banner (optional)', 'Wide image for your store page')}
          </div>

          <div class="wwc-create-section">
            <h2>Location & delivery</h2>
            <div class="wwc-create-field"><label for="country">Store location (country) *</label>${C.countrySelectHtml(state.countries, '', 'country')}</div>
            <div class="wwc-create-field" id="state-wrap" hidden><label for="us-state">U.S. state *</label>${C.stateSelectHtml(state.usStates, '', 'us-state', true)}</div>
            <div class="wwc-create-field"><label for="delivery">Where do you deliver? *</label><select id="delivery" required>${deliveryOpts}</select></div>
            <div class="wwc-create-field" id="delivery-notes-wrap" hidden><label for="delivery-notes">Delivery notes *</label><textarea id="delivery-notes" placeholder="Describe your shipping or delivery rules…"></textarea></div>
          </div>

          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Submit store for review</button>
            <a href="post.html" class="wwc-btn wwc-btn-ghost">Cancel</a>
          </div>
        </form>
      </div>`;

    bindForm();
  }

  function escapeAttr(s) {
    return WWC_UTIL.escapeAttr(s);
  }

  function mediaField(id, label, sub) {
    return `
      <div class="wwc-create-field">
        <label>${label}</label>
        <div class="wwc-media-zone wwc-media-zone-square" id="${id}-zone" tabindex="0" role="button">
          <p>Tap to upload</p><small>${escapeHtml(sub)}</small>
          <input type="file" id="${id}-input" accept="image/jpeg,image/png,image/webp" />
        </div>
        <p class="wwc-create-hint" id="${id}-status" hidden></p>
      </div>`;
  }

  function setZonePreview(zoneId, url) {
    const zone = document.getElementById(`${zoneId}-zone`);
    if (!zone || !url) return;
    zone.classList.add('has-image');
    zone.innerHTML = `<img src="${escapeAttr(WWC_API.resolveMediaUrl(url))}" alt="" />`;
  }

  function bindUpload(zoneId, assetKey) {
    const zone = document.getElementById(`${zoneId}-zone`);
    const input = document.getElementById(`${zoneId}-input`);
    const status = document.getElementById(`${zoneId}-status`);
    zone?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (status) { status.hidden = false; status.textContent = 'Uploading…'; }
      try {
        const url = await C.uploadStoreMedia(file, assetKey);
        state[assetKey === 'logo' ? 'logoUrl' : 'bannerUrl'] = url;
        setZonePreview(zoneId, url);
        if (status) status.hidden = true;
      } catch (e) {
        if (status) { status.textContent = e.message; status.style.color = 'var(--wwc-danger)'; }
      }
      input.value = '';
    });
  }

  function bindForm() {
    C.bindUsStateToggle('country', 'state-wrap', state.usCode);
    bindUpload('logo', 'logo');
    bindUpload('banner', 'banner');

    const delivery = document.getElementById('delivery');
    const notesWrap = document.getElementById('delivery-notes-wrap');
    const notes = document.getElementById('delivery-notes');
    delivery?.addEventListener('change', () => {
      const custom = delivery.value === 'custom';
      if (notesWrap) notesWrap.hidden = !custom;
      if (notes) notes.required = custom;
    });

    document.getElementById('store-form')?.addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    C.clearFormError(root);

    const name = document.getElementById('name')?.value.trim();
    const sells = document.getElementById('sells')?.value.trim();
    const description = document.getElementById('description')?.value.trim();
    const country = document.getElementById('country')?.value;
    const usState = document.getElementById('us-state')?.value;
    const categoryId = document.getElementById('category')?.value;
    const deliveryType = document.getElementById('delivery')?.value;
    const deliveryNotes = document.getElementById('delivery-notes')?.value.trim() || '';

    if (!name || !sells || !description) { C.showFormError(root, 'Store name, summary, and description are required.'); return; }
    if (!country) { C.showFormError(root, 'Select a country.'); return; }
    if (country === state.usCode && !usState) { C.showFormError(root, 'Select a U.S. state.'); return; }
    if (!state.logoUrl) { C.showFormError(root, 'Upload a store logo.'); return; }
    if (deliveryType === 'custom' && deliveryNotes.length < 3) { C.showFormError(root, 'Describe your delivery rules (at least 3 characters).'); return; }

    const body = {
      name,
      sells_summary: sells,
      description,
      logo_url: state.logoUrl,
      banner_url: state.bannerUrl || '',
      location_country_code: country,
      delivery_type: deliveryType,
      delivery_notes: deliveryNotes,
    };
    if (categoryId) body.category_id = Number(categoryId);
    if (country === state.usCode && usState) body.location_us_state_code = usState;

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const data = await apiPost('store-create.php', body);
      root.innerHTML = `
        <div class="wwc-create-form">
          <div class="wwc-create-success">${escapeHtml(data.message || 'Store submitted for review.')}</div>
          <p class="wwc-create-lead">Once approved, add products from My stores.</p>
          <div class="wwc-create-actions">
            <a href="my-office.html" class="wwc-btn wwc-btn-primary">My stores</a>
            <a href="post.html" class="wwc-btn wwc-btn-ghost">Back to Create</a>
          </div>
        </div>`;
    } catch (ex) {
      C.showFormError(root, ex.message || 'Could not create store.');
      btn.disabled = false;
      btn.textContent = 'Submit store for review';
    }
  }

  async function init() {
    WWC_UTIL.showLoading(root);
    try {
      const [loc, catData] = await Promise.all([C.loadLocations(), apiGet('store-categories.php', true)]);
      state.countries = loc.countries;
      state.usStates = loc.usStates;
      state.usCode = loc.usCode;
      state.categories = Array.isArray(catData.categories) ? catData.categories : [];
      renderForm();
    } catch (e) {
      WWC_UTIL.showError(root, e.message, init);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: init });
})();

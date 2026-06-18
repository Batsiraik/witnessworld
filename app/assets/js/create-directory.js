(function () {
  const { apiPost, apiGet } = WWC_API;
  const { escapeHtml } = WWC_UTIL;
  const C = WWC_CREATE;
  const root = document.getElementById('create-root');

  const state = {
    logoUrl: null,
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

    const catOpts = ['<option value="">Select category *</option>']
      .concat(state.categories.map((c) => `<option value="${c.id}" data-slug="${WWC_UTIL.escapeAttr(c.slug)}">${escapeHtml(c.name)}</option>`))
      .join('');

    root.innerHTML = `
      <div class="wwc-create-form">
        <span class="wwc-create-pill">Business directory</span>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">List Your Business</h1>
        <p class="wwc-create-lead">Add your brick-and-mortar or local service business so brothers and sisters can find and support you.</p>

        <form id="dir-form">
          <div class="wwc-create-section">
            <h2>Business</h2>
            <div class="wwc-create-field"><label for="business_name">Business name *</label><input id="business_name" required /></div>
            <div class="wwc-create-field"><label for="tagline">Tagline</label><input id="tagline" placeholder="Short line about your business" /></div>
            <div class="wwc-create-field"><label for="category">Category *</label><select id="category" required>${catOpts}</select></div>
            <div class="wwc-create-field"><label for="description">Description</label><textarea id="description" placeholder="Services, specialties, what makes your business unique…"></textarea></div>
            <div class="wwc-create-field">
              <label>Logo (optional)</label>
              <div class="wwc-media-zone wwc-media-zone-square" id="logo-zone" tabindex="0" role="button">
                <p>Tap to upload logo</p><small>JPG, PNG or WebP</small>
                <input type="file" id="logo-input" accept="image/jpeg,image/png,image/webp" />
              </div>
              <p class="wwc-create-hint" id="logo-status" hidden></p>
            </div>
          </div>

          <div class="wwc-create-section">
            <h2>Location</h2>
            <div class="wwc-create-field"><label for="country">Country *</label>${C.countrySelectHtml(state.countries, '', 'country')}</div>
            <div class="wwc-create-field" id="state-wrap" hidden><label for="us-state">U.S. state *</label>${C.stateSelectHtml(state.usStates, '', 'us-state', true)}</div>
            <div class="wwc-create-field"><label for="address">Street address</label><input id="address" /></div>
            <div class="wwc-create-field"><label for="city">City *</label><input id="city" required /></div>
            <div class="wwc-create-field"><label for="postal">Postal / ZIP</label><input id="postal" /></div>
          </div>

          <div class="wwc-create-section">
            <h2>Contact</h2>
            <div class="wwc-create-field"><label for="phone">Public phone *</label><input id="phone" type="tel" required /></div>
            <div class="wwc-create-field"><label for="email">Public email *</label><input id="email" type="email" required /></div>
            <div class="wwc-create-field"><label for="website">Website</label><input id="website" type="url" placeholder="https://" /></div>
            <div class="wwc-create-field"><label for="map_url">Map link</label><input id="map_url" type="url" placeholder="Google Maps URL" /></div>
            <div class="wwc-create-field"><label for="hours">Hours</label><textarea id="hours" placeholder="Mon–Fri 9am–5pm, Sat by appointment…"></textarea></div>
          </div>

          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Submit for review</button>
            <a href="post.html" class="wwc-btn wwc-btn-ghost">Cancel</a>
          </div>
        </form>
      </div>`;

    bindForm();
  }

  function bindForm() {
    C.bindUsStateToggle('country', 'state-wrap', state.usCode);

    const zone = document.getElementById('logo-zone');
    const input = document.getElementById('logo-input');
    const status = document.getElementById('logo-status');
    zone?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (status) { status.hidden = false; status.textContent = 'Uploading…'; }
      try {
        state.logoUrl = await C.uploadDirectoryMedia(file);
        zone.classList.add('has-image');
        zone.innerHTML = `<img src="${WWC_UTIL.escapeAttr(WWC_API.resolveMediaUrl(state.logoUrl))}" alt="" />`;
        if (status) status.hidden = true;
      } catch (e) {
        if (status) { status.textContent = e.message; status.style.color = 'var(--wwc-danger)'; }
      }
      input.value = '';
    });

    document.getElementById('dir-form')?.addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    C.clearFormError(root);

    const catEl = document.getElementById('category');
    const catId = catEl?.value;
    const catSlug = catEl?.selectedOptions?.[0]?.getAttribute('data-slug') || '';
    const country = document.getElementById('country')?.value;
    const usState = document.getElementById('us-state')?.value;
    const businessName = document.getElementById('business_name')?.value.trim();
    const city = document.getElementById('city')?.value.trim();
    const phone = document.getElementById('phone')?.value.trim();
    const email = document.getElementById('email')?.value.trim();

    if (!catId) { C.showFormError(root, 'Select a category.'); return; }
    if (!country) { C.showFormError(root, 'Select a country.'); return; }
    if (country === state.usCode && !usState) { C.showFormError(root, 'Select a U.S. state.'); return; }
    if (!businessName || !city || !phone || !email) { C.showFormError(root, 'Business name, city, phone, and email are required.'); return; }

    const body = {
      business_name: businessName,
      tagline: document.getElementById('tagline')?.value.trim() || '',
      description: document.getElementById('description')?.value.trim() || '',
      category: catSlug,
      category_id: Number(catId),
      location_country_code: country,
      address_line: document.getElementById('address')?.value.trim() || '',
      city,
      postal_code: document.getElementById('postal')?.value.trim() || '',
      phone,
      email,
      website: document.getElementById('website')?.value.trim() || '',
      map_url: document.getElementById('map_url')?.value.trim() || '',
      hours_text: document.getElementById('hours')?.value.trim() || '',
      logo_url: state.logoUrl || '',
    };
    if (country === state.usCode && usState) body.location_us_state_code = usState;

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const data = await apiPost('directory-entry-create.php', body);
      root.innerHTML = `
        <div class="wwc-create-form">
          <div class="wwc-create-success">${escapeHtml(data.message || 'Your business was sent for review.')}</div>
          <div class="wwc-create-actions">
            <a href="post.html" class="wwc-btn wwc-btn-primary">Back to Create</a>
            <a href="directory.html" class="wwc-btn wwc-btn-ghost">Browse directory</a>
          </div>
        </div>`;
    } catch (ex) {
      C.showFormError(root, ex.message || 'Could not save business.');
      btn.disabled = false;
      btn.textContent = 'Submit for review';
    }
  }

  async function init() {
    WWC_UTIL.showLoading(root);
    try {
      const [loc, catData] = await Promise.all([C.loadLocations(), apiGet('directory-categories.php', true)]);
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

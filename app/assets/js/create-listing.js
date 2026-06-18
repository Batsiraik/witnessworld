(function () {
  const { apiGet, apiPost } = WWC_API;
  const { qs, qsInt, escapeHtml } = WWC_UTIL;
  const C = WWC_CREATE;
  const root = document.getElementById('create-root');

  const editId = qsInt('id') > 0 ? qsInt('id') : 0;
  let editListing = null;

  let listingType = (() => {
    const t = (qs('type') || 'classified').toLowerCase();
    return t === 'service' || t === 'community' ? t : 'classified';
  })();

  const isClassified = () => listingType === 'classified';
  const copy = () => C.LISTING_COPY[listingType];

  const state = {
    mainUrl: null,
    videoUrl: null,
    portfolioUrls: [],
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

    const c = copy();
    const ed = editListing;
    const pageTitle = editId ? 'Edit listing' : c.title;
    const submitLabel = editId ? 'Save changes' : 'Submit for review';

    root.innerHTML = `
      <div class="wwc-create-form">
        <span class="wwc-create-pill">${escapeHtml(c.pill)}</span>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">${escapeHtml(pageTitle)}</h1>
        <p class="wwc-create-lead">${escapeHtml(c.lead)}</p>

        <form id="listing-form">
          <div class="wwc-create-section">
            <h2>Details</h2>
            <div class="wwc-create-field">
              <label for="title">${c.titleLabel}</label>
              <input id="title" required maxlength="255" placeholder="${escapeAttr(c.titlePh)}" value="${ed ? escapeAttr(ed.title || '') : ''}" />
            </div>
            <div class="wwc-create-field">
              <label for="description">${c.descLabel}</label>
              <textarea id="description" required placeholder="${escapeAttr(c.descPh)}">${ed ? escapeHtml(ed.description || '') : ''}</textarea>
            </div>
            <div class="wwc-create-field">
              <label for="category">Category</label>
              ${C.categorySelectHtml(state.categories, ed?.category_id || '', 'category')}
            </div>
            ${isClassified() ? `
            <div class="wwc-create-field">
              <label class="wwc-create-check"><input type="checkbox" id="is-free"${ed?.is_free ? ' checked' : ''} /> FREE — giving it away</label>
            </div>
            <div class="wwc-create-field" id="price-wrap">
              <label for="price">Price</label>
              <input id="price" type="number" min="0" step="0.01" placeholder="0.00" value="${ed?.price_amount != null && ed.price_amount !== '' ? escapeAttr(String(ed.price_amount)) : ''}" />
              <p class="wwc-create-hint">Enter a price or check FREE above.</p>
            </div>` : ''}
            <div class="wwc-create-field">
              <label for="skills">${c.skillsLabel}</label>
              <input id="skills" placeholder="${escapeAttr(c.skillsPh)}" value="${ed?.soft_skills?.length ? escapeAttr(ed.soft_skills.join(', ')) : ''}" />
              <p class="wwc-create-hint">Comma-separated tags.</p>
            </div>
          </div>

          <div class="wwc-create-section">
            <h2>Location</h2>
            <div class="wwc-create-field">
              <label for="country">Country *</label>
              ${C.countrySelectHtml(state.countries, ed?.location_country_code || '', 'country')}
            </div>
            <div class="wwc-create-field" id="state-wrap"${ed?.location_country_code === state.usCode ? '' : ' hidden'}>
              <label for="us-state">U.S. state *</label>
              ${C.stateSelectHtml(state.usStates, ed?.location_us_state_code || '', 'us-state', true)}
            </div>
          </div>

          <div class="wwc-create-section">
            <h2>Media</h2>
            ${mediaField('main', 'Main image *', 'Required · JPG, PNG or WebP · max 5 MB')}
            ${mediaField('video', 'Video (optional)', 'MP4 or MOV · max 45 MB')}
            <div class="wwc-create-field">
              <label>${c.portfolioLabel}</label>
              <div class="wwc-media-zone" id="portfolio-zone" tabindex="0" role="button">
                <p>Add extra photos</p>
                <small>Up to 12 images · JPG, PNG or WebP</small>
                <input type="file" id="portfolio-input" accept="image/jpeg,image/png,image/webp" multiple />
              </div>
              <div class="wwc-portfolio-grid" id="portfolio-grid"></div>
            </div>
          </div>

          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">${escapeHtml(submitLabel)}</button>
            <a href="${editId ? 'my-office.html' : 'post.html'}" class="wwc-btn wwc-btn-ghost">Cancel</a>
          </div>
        </form>
      </div>`;

    document.title = `${pageTitle} · Witness World Connect`;
    bindForm();
    populateMediaFromEdit();
  }

  function populateMediaFromEdit() {
    if (!editListing) return;
    if (editListing.media_url) {
      state.mainUrl = editListing.media_url;
      setZonePreview('main', editListing.media_url);
    }
    if (editListing.video_url) {
      state.videoUrl = editListing.video_url;
      setZonePreview('video', editListing.video_url);
    }
    if (editListing.portfolio_urls?.length) {
      state.portfolioUrls = [...editListing.portfolio_urls];
      renderPortfolio();
    }
  }

  function escapeAttr(s) {
    return WWC_UTIL.escapeAttr(s);
  }

  function mediaField(id, label, sub) {
    return `
      <div class="wwc-create-field">
        <label>${label}</label>
        <div class="wwc-media-zone" id="${id}-zone" tabindex="0" role="button">
          <p id="${id}-text">Tap to upload</p>
          <small>${escapeHtml(sub)}</small>
          <input type="file" id="${id}-input" accept="${id === 'video' ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp'}" />
        </div>
        <p class="wwc-create-hint" id="${id}-status" hidden></p>
      </div>`;
  }

  function setZonePreview(zoneId, url) {
    const zone = document.getElementById(`${zoneId}-zone`);
    if (!zone || !url) return;
    zone.classList.add('has-image');
    const resolved = WWC_API.resolveMediaUrl(url);
    zone.innerHTML = `<img src="${escapeAttr(resolved)}" alt="" />`;
  }

  function bindSingleUpload(zoneId, onDone) {
    const zone = document.getElementById(`${zoneId}-zone`);
    const input = document.getElementById(`${zoneId}-input`);
    const status = document.getElementById(`${zoneId}-status`);
    if (!zone || !input) return;

    const openPicker = () => input.click();
    zone.addEventListener('click', openPicker);

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (status) {
        status.hidden = false;
        status.textContent = 'Uploading…';
        status.style.color = '';
      }
      try {
        const url = await onDone(file);
        setZonePreview(zoneId, url);
        if (status) status.hidden = true;
      } catch (e) {
        if (status) {
          status.textContent = e.message || 'Upload failed';
          status.style.color = 'var(--wwc-danger)';
        }
      }
      input.value = '';
    });
  }

  function renderPortfolio() {
    const grid = document.getElementById('portfolio-grid');
    if (!grid) return;
    grid.innerHTML = state.portfolioUrls
      .map(
        (url, i) =>
          `<div style="position:relative"><img src="${escapeAttr(WWC_API.resolveMediaUrl(url))}" alt="" /><button type="button" data-rm="${i}" style="position:absolute;top:4px;right:4px;width:22px;height:22px;border:none;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;font-weight:800;cursor:pointer">×</button></div>`
      )
      .join('');
    grid.querySelectorAll('[data-rm]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = Number(btn.getAttribute('data-rm'));
        state.portfolioUrls.splice(idx, 1);
        renderPortfolio();
      });
    });
  }

  function bindForm() {
    C.bindUsStateToggle('country', 'state-wrap', state.usCode);

    const freeEl = document.getElementById('is-free');
    const priceWrap = document.getElementById('price-wrap');
    const syncFree = () => {
      if (priceWrap) priceWrap.hidden = !!freeEl?.checked;
    };
    freeEl?.addEventListener('change', syncFree);
    syncFree();

    bindSingleUpload('main', async (file) => {
      const url = await C.uploadListingMedia(file);
      state.mainUrl = url;
      return url;
    });

    bindSingleUpload('video', async (file) => {
      const url = await C.uploadListingMedia(file);
      state.videoUrl = url;
      return url;
    });

    const portZone = document.getElementById('portfolio-zone');
    const portInput = document.getElementById('portfolio-input');
    portZone?.addEventListener('click', () => portInput?.click());
    portInput?.addEventListener('change', async () => {
      const files = Array.from(portInput.files || []);
      for (const file of files) {
        if (state.portfolioUrls.length >= 12) break;
        try {
          const url = await C.uploadListingMedia(file);
          state.portfolioUrls.push(url);
        } catch {
          /* skip failed */
        }
      }
      renderPortfolio();
      portInput.value = '';
    });

    document.getElementById('listing-form')?.addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    C.clearFormError(root);

    const title = document.getElementById('title')?.value.trim();
    const description = document.getElementById('description')?.value.trim();
    const country = document.getElementById('country')?.value;
    const usState = document.getElementById('us-state')?.value;
    const categoryId = document.getElementById('category')?.value;
    const isFree = document.getElementById('is-free')?.checked;
    const price = document.getElementById('price')?.value.trim();
    const skills = C.parseTags(document.getElementById('skills')?.value);

    if (!title || !description) {
      C.showFormError(root, 'Title and description are required.');
      return;
    }
    if (!country) {
      C.showFormError(root, 'Select a country.');
      return;
    }
    if (country === state.usCode && !usState) {
      C.showFormError(root, 'Select a U.S. state.');
      return;
    }
    if (!state.mainUrl) {
      C.showFormError(root, 'Add a main image for your listing.');
      return;
    }

    const body = {
      listing_type: listingType,
      title,
      description,
      media_url: state.mainUrl,
      portfolio_urls: state.portfolioUrls,
      soft_skills: skills,
      location_country_code: country,
    };
    if (country === state.usCode && usState) body.location_us_state_code = usState;
    if (state.videoUrl) body.video_url = state.videoUrl;
    if (categoryId) body.category_id = Number(categoryId);
    if (isClassified()) {
      body.is_free = !!isFree;
      if (!isFree && price) body.price_amount = price;
    }

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = editId ? 'Saving…' : 'Submitting…';
    try {
      if (editId) {
        body.listing_id = editId;
        const data = await apiPost('listing-update.php', body);
        root.innerHTML = `
          <div class="wwc-create-form">
            <div class="wwc-create-success">${escapeHtml(data.message || 'Listing updated.')}</div>
            <div class="wwc-create-actions">
              <a href="listing.html?id=${editId}" class="wwc-btn wwc-btn-primary">View listing</a>
              <a href="my-office.html" class="wwc-btn wwc-btn-ghost">My office</a>
            </div>
          </div>`;
      } else {
        const data = await apiPost('listing-create.php', body);
        const msg = data.message || 'Your listing was submitted for review.';
        root.innerHTML = `
          <div class="wwc-create-form">
            <div class="wwc-create-success">${escapeHtml(msg)}</div>
            <div class="wwc-create-actions">
              <a href="post.html" class="wwc-btn wwc-btn-primary">Back to Create</a>
              <a href="my-office.html" class="wwc-btn wwc-btn-ghost">My office</a>
            </div>
          </div>`;
      }
    } catch (ex) {
      C.showFormError(root, ex.message || 'Could not save listing.');
      btn.disabled = false;
      btn.textContent = editId ? 'Save changes' : 'Submit for review';
    }
  }

  async function init() {
    WWC_UTIL.showLoading(root);
    try {
      if (editId) {
        const data = await apiGet(`listing-detail.php?id=${editId}`);
        editListing = data.listing;
        if (!editListing) throw new Error('Listing not found');
        const t = (editListing.listing_type || '').toLowerCase();
        if (t === 'service' || t === 'community' || t === 'classified') listingType = t;
      }
      const [loc, cats] = await Promise.all([C.loadLocations(), C.loadCategories(listingType)]);
      state.countries = loc.countries;
      state.usStates = loc.usStates;
      state.usCode = loc.usCode;
      state.categories = cats;
      renderForm();
    } catch (e) {
      WWC_UTIL.showError(root, e.message, init);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: init });
})();

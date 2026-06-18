/**
 * Shared create-form utilities for web posting flows.
 */
(function (global) {
  const { apiGet, apiUpload, resolveMediaUrl } = global.WWC_API;
  const { escapeHtml, escapeAttr } = global.WWC_UTIL;

  const LISTING_COPY = {
    classified: {
      pill: 'Marketplace listing',
      title: 'Sell or Give Away an Item',
      lead: 'Give quality items a second home. Buy, sell, or share household goods locally within your community.',
      titleLabel: 'Ad title *',
      titlePh: 'e.g. Couch + loveseat · must go by Friday · $400',
      descLabel: 'Ad details *',
      descPh: 'Describe the item, condition, asking price or best offer, location, and how to contact you…',
      skillsLabel: 'Tags (optional)',
      skillsPh: 'e.g. Negotiable, Delivery extra, Trade considered',
      portfolioLabel: 'Extra photos (optional)',
    },
    service: {
      pill: 'Professional service',
      title: 'Offer a Professional Service',
      lead: 'Showcase your expertise to entrepreneurs and businesses worldwide — digital and virtual services.',
      titleLabel: 'Headline *',
      titlePh: 'e.g. Mobile notary · evenings & weekends — same-day appointments',
      descLabel: 'What you deliver *',
      descPh: 'Experience, packages or pricing style, service area, how to book you…',
      skillsLabel: 'Skills & strengths (optional)',
      skillsPh: 'e.g. React Native, SEO, Bookkeeping, Spanish',
      portfolioLabel: 'Portfolio / past work (optional)',
    },
    community: {
      pill: 'Community classified',
      title: 'Post a Community Classified',
      lead: 'Personal needs and community notices — sitters, roommates, tutoring, neighborhood updates.',
      titleLabel: 'Ad title *',
      titlePh: 'e.g. Babysitter needed Saturdays · downtown area',
      descLabel: 'Ad details *',
      descPh: 'Describe what you need or are offering, timing, location, and how to reach you…',
      skillsLabel: 'Tags (optional)',
      skillsPh: 'e.g. Evenings, Licensed, Local only',
      portfolioLabel: 'More photos (optional)',
    },
  };

  const CAT_ENDPOINTS = {
    classified: 'marketplace-categories.php',
    service: 'service-categories.php',
    community: 'community-categories.php',
  };

  const DELIVERY_OPTIONS = [
    { value: 'digital_only', label: 'Digital only', sub: 'No shipping — files, licenses, downloads' },
    { value: 'usa_only', label: 'USA only', sub: 'Ship within the United States' },
    { value: 'worldwide', label: 'Worldwide', sub: 'International shipping' },
    { value: 'local_pickup', label: 'Local pickup', sub: 'Buyers collect in person' },
    { value: 'custom', label: 'Custom / other', sub: 'Describe below' },
  ];

  function hasAvatar(user) {
    return !!(user?.avatar_url && String(user.avatar_url).trim());
  }

  async function loadLocations() {
    const data = await apiGet('locations.php', true);
    return {
      countries: Array.isArray(data.countries) ? data.countries : [],
      usStates: Array.isArray(data.us_states) ? data.us_states : [],
      usCode: data.us_country_code || 'US',
    };
  }

  async function loadCategories(listingType) {
    const ep = CAT_ENDPOINTS[listingType] || CAT_ENDPOINTS.classified;
    const data = await apiGet(ep, true);
    return Array.isArray(data.categories) ? data.categories : [];
  }

  function countrySelectHtml(countries, selectedCode, id) {
    const opts = ['<option value="">Select country *</option>']
      .concat(countries.map((c) => `<option value="${escapeAttr(c.code)}"${c.code === selectedCode ? ' selected' : ''}>${escapeHtml(c.name)}</option>`))
      .join('');
    return `<select id="${id}" required>${opts}</select>`;
  }

  function stateSelectHtml(states, selectedCode, id, required) {
    const opts = [`<option value="">${required ? 'Select U.S. state *' : 'Select U.S. state (optional)'}</option>`]
      .concat(states.map((s) => `<option value="${escapeAttr(s.code)}"${s.code === selectedCode ? ' selected' : ''}>${escapeHtml(s.name)}</option>`))
      .join('');
    return `<select id="${id}"${required ? ' required' : ''}>${opts}</select>`;
  }

  function categorySelectHtml(categories, selectedId, id) {
    const opts = ['<option value="">Category (optional)</option>']
      .concat(categories.map((c) => `<option value="${c.id}"${String(c.id) === String(selectedId) ? ' selected' : ''}>${escapeHtml(c.name)}</option>`))
      .join('');
    return `<select id="${id}">${opts}</select>`;
  }

  function mediaZoneHtml(id, label, subtitle, square) {
    return `
      <div class="wwc-create-field">
        <label>${label}</label>
        <div class="wwc-media-zone${square ? ' wwc-media-zone-square' : ''}" id="${id}-zone" tabindex="0" role="button">
          <p id="${id}-label">Tap to upload</p>
          <small>${escapeHtml(subtitle)}</small>
          <input type="file" id="${id}-input" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" />
        </div>
        <p class="wwc-create-hint" id="${id}-status" hidden></p>
      </div>`;
  }

  function bindMediaZone(zoneId, onUploaded, acceptImagesOnly) {
    const zone = document.getElementById(`${zoneId}-zone`);
    const input = document.getElementById(`${zoneId}-input`);
    const status = document.getElementById(`${zoneId}-status`);
    const label = document.getElementById(`${zoneId}-label`);
    if (!zone || !input) return;

    if (acceptImagesOnly) {
      input.accept = 'image/jpeg,image/png,image/webp';
    }

    const open = () => input.click();
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (status) {
        status.hidden = false;
        status.textContent = 'Uploading…';
      }
      zone.style.pointerEvents = 'none';
      try {
        const url = await onUploaded(file);
        if (url) {
          zone.classList.add('has-image');
          zone.innerHTML = `<img src="${escapeAttr(resolveMediaUrl(url))}" alt="" /><input type="file" id="${zoneId}-input" accept="${escapeAttr(input.accept)}" style="display:none" />`;
          bindMediaZone(zoneId, onUploaded, acceptImagesOnly);
          if (label) label.textContent = 'Replace';
        }
        if (status) status.hidden = true;
      } catch (e) {
        if (status) {
          status.textContent = e.message || 'Upload failed';
          status.style.color = 'var(--wwc-danger)';
        }
      } finally {
        zone.style.pointerEvents = '';
        input.value = '';
      }
    });
  }

  async function uploadListingMedia(file) {
    const form = new FormData();
    form.append('file', file, file.name || 'photo.jpg');
    const data = await apiUpload('listing-media-upload.php', form);
    if (!data.url) throw new Error('No file URL returned');
    return data.url;
  }

  async function uploadStoreMedia(file, asset) {
    const form = new FormData();
    form.append('asset', asset);
    form.append('file', file, file.name || `${asset}.jpg`);
    const data = await apiUpload('store-media-upload.php', form);
    if (!data.url) throw new Error('No file URL returned');
    return data.url;
  }

  async function uploadDirectoryMedia(file) {
    const form = new FormData();
    form.append('file', file, file.name || 'logo.jpg');
    const data = await apiUpload('directory-media-upload.php', form);
    if (!data.url) throw new Error('No file URL returned');
    return data.url;
  }

  async function uploadProductMedia(file, storeId) {
    const form = new FormData();
    form.append('store_id', String(storeId));
    form.append('file', file, file.name || 'product.jpg');
    const data = await apiUpload('product-media-upload.php', form);
    if (!data.url) throw new Error('No file URL returned');
    return data.url;
  }

  function bindUsStateToggle(countryId, stateWrapId, usCode) {
    const countryEl = document.getElementById(countryId);
    const stateWrap = document.getElementById(stateWrapId);
    if (!countryEl || !stateWrap) return;
    const sync = () => {
      const isUs = countryEl.value === usCode;
      stateWrap.hidden = !isUs;
      const sel = stateWrap.querySelector('select');
      if (sel) sel.required = isUs;
    };
    countryEl.addEventListener('change', sync);
    sync();
  }

  function parseTags(text) {
    return String(text || '')
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function showFormError(root, msg) {
    let el = root.querySelector('.wwc-create-error');
    if (!el) {
      el = document.createElement('div');
      el.className = 'wwc-create-error';
      root.prepend(el);
    }
    el.textContent = msg;
    el.hidden = false;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function clearFormError(root) {
    const el = root.querySelector('.wwc-create-error');
    if (el) el.hidden = true;
  }

  function avatarGateHtml() {
    return `<div class="wwc-create-error">Upload a profile photo in <a href="profile.html" style="color:inherit;text-decoration:underline">Profile</a> before posting.</div>`;
  }

  global.WWC_CREATE = {
    LISTING_COPY,
    CAT_ENDPOINTS,
    DELIVERY_OPTIONS,
    hasAvatar,
    loadLocations,
    loadCategories,
    countrySelectHtml,
    stateSelectHtml,
    categorySelectHtml,
    mediaZoneHtml,
    bindMediaZone,
    uploadListingMedia,
    uploadStoreMedia,
    uploadDirectoryMedia,
    uploadProductMedia,
    bindUsStateToggle,
    parseTags,
    showFormError,
    clearFormError,
    avatarGateHtml,
  };
})(window);

(function () {
  const { apiPost, apiGet } = WWC_API;
  const { qs, escapeHtml } = WWC_UTIL;
  const C = WWC_CREATE;
  const root = document.getElementById('create-root');
  const MAX = 8;

  const storeId = Number(qs('store_id') || 0);
  const state = { imageUrls: [], storeName: '' };

  function renderGallery() {
    const wrap = document.getElementById('gallery-preview');
    const status = document.getElementById('image-status');
    if (!wrap) return;
    if (!state.imageUrls.length) {
      wrap.innerHTML = '';
      if (status) status.hidden = true;
      return;
    }
    wrap.innerHTML = state.imageUrls
      .map(
        (url, i) =>
          `<div class="wwc-gallery-thumb" data-idx="${i}">
            <img src="${WWC_UTIL.escapeAttr(WWC_API.resolveMediaUrl(url))}" alt="" />
            ${i === 0 ? '<span class="wwc-gallery-cover">Cover</span>' : ''}
            <button type="button" class="wwc-gallery-remove" data-idx="${i}" aria-label="Remove">×</button>
          </div>`
      )
      .join('');
    if (status) {
      status.hidden = false;
      status.style.color = '';
      status.textContent = `${state.imageUrls.length}/${MAX} photos · first is cover`;
    }
  }

  function renderForm() {
    root.innerHTML = `
      <div class="wwc-create-form">
        <span class="wwc-create-pill">Store product</span>
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">Add Product</h1>
        <p class="wwc-create-lead">${state.storeName ? `Adding to <strong>${escapeHtml(state.storeName)}</strong>.` : 'Add a new product to your approved store.'}</p>

        <form id="product-form">
          <div class="wwc-create-section">
            <h2>Product</h2>
            <div class="wwc-create-field">
              <label>Product photos *</label>
              <div id="gallery-preview" class="wwc-gallery-preview"></div>
              <div class="wwc-media-zone" id="image-zone" tabindex="0" role="button">
                <p>Tap to upload photos</p><small>Up to ${MAX} · JPG, PNG or WebP · first is cover</small>
                <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" multiple />
              </div>
              <p class="wwc-create-hint" id="image-status" hidden></p>
            </div>
            <div class="wwc-create-field"><label for="name">Product name *</label><input id="name" required /></div>
            <div class="wwc-create-field"><label for="price">Price *</label><input id="price" type="number" min="0" step="0.01" required placeholder="0.00" /></div>
            <div class="wwc-create-field"><label for="currency">Currency *</label><input id="currency" value="USD" maxlength="3" required /></div>
            <div class="wwc-create-field"><label for="description">Description</label><textarea id="description"></textarea></div>
            <div class="wwc-create-field"><label for="specs">Specifications</label><textarea id="specs" placeholder="Size, materials, variants…"></textarea></div>
          </div>

          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Submit product for review</button>
            <a href="my-office.html" class="wwc-btn wwc-btn-ghost">Cancel</a>
          </div>
        </form>
      </div>
      <style>
        .wwc-gallery-preview { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
        .wwc-gallery-thumb { position:relative; width:88px; height:88px; border-radius:12px; overflow:hidden; background:#eef6fc; }
        .wwc-gallery-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
        .wwc-gallery-cover { position:absolute; left:6px; top:6px; background:#059669; color:#fff; font-size:10px; font-weight:800; padding:2px 6px; border-radius:6px; }
        .wwc-gallery-remove { position:absolute; right:4px; top:4px; width:22px; height:22px; border:0; border-radius:999px; background:#dc2626; color:#fff; font-weight:800; cursor:pointer; }
      </style>`;

    const zone = document.getElementById('image-zone');
    const input = document.getElementById('image-input');
    const status = document.getElementById('image-status');
    const preview = document.getElementById('gallery-preview');
    zone?.addEventListener('click', (e) => {
      if (e.target.closest('.wwc-gallery-remove')) return;
      input?.click();
    });
    preview?.addEventListener('click', (e) => {
      const btn = e.target.closest('.wwc-gallery-remove');
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const idx = Number(btn.getAttribute('data-idx'));
      state.imageUrls.splice(idx, 1);
      renderGallery();
    });
    input?.addEventListener('change', async () => {
      const files = Array.from(input.files || []);
      if (!files.length) return;
      if (status) {
        status.hidden = false;
        status.style.color = '';
        status.textContent = 'Uploading…';
      }
      try {
        for (const file of files) {
          if (state.imageUrls.length >= MAX) break;
          const url = await C.uploadProductMedia(file, storeId);
          if (url && !state.imageUrls.includes(url)) state.imageUrls.push(url);
        }
        renderGallery();
      } catch (e) {
        if (status) {
          status.hidden = false;
          status.textContent = e.message;
          status.style.color = 'var(--wwc-danger)';
        }
      }
      input.value = '';
    });

    document.getElementById('product-form')?.addEventListener('submit', submit);
  }

  async function submit(e) {
    e.preventDefault();
    C.clearFormError(root);

    const name = document.getElementById('name')?.value.trim();
    const price = document.getElementById('price')?.value.trim();
    const currency = document.getElementById('currency')?.value.trim().toUpperCase();

    if (!state.imageUrls.length) {
      C.showFormError(root, 'Add at least one product photo.');
      return;
    }
    if (!name) {
      C.showFormError(root, 'Enter a product name.');
      return;
    }
    if (!price || Number.isNaN(Number(price))) {
      C.showFormError(root, 'Enter a valid price.');
      return;
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      C.showFormError(root, 'Use a 3-letter currency code like USD.');
      return;
    }

    const body = {
      store_id: storeId,
      name,
      price_amount: price,
      currency,
      description: document.getElementById('description')?.value.trim() || '',
      specifications: document.getElementById('specs')?.value.trim() || '',
      image_url: state.imageUrls[0],
      gallery_urls: state.imageUrls,
    };

    const btn = document.getElementById('submit-btn');
    btn.disabled = true;
    btn.textContent = 'Submitting…';
    try {
      const data = await apiPost('product-create.php', body);
      root.innerHTML = `
        <div class="wwc-create-form">
          <div class="wwc-create-success">${escapeHtml(data.message || 'Product submitted for review.')}</div>
          <div class="wwc-create-actions">
            <a href="my-office.html" class="wwc-btn wwc-btn-primary">My stores</a>
            <a href="create-product.html?store_id=${storeId}" class="wwc-btn wwc-btn-ghost">Add another</a>
          </div>
        </div>`;
    } catch (ex) {
      C.showFormError(root, ex.message || 'Could not create product.');
      btn.disabled = false;
      btn.textContent = 'Submit product for review';
    }
  }

  async function init() {
    if (!storeId) {
      root.innerHTML = `<div class="wwc-create-error">Missing store. <a href="my-office.html">Go to My stores</a></div>`;
      return;
    }
    WWC_UTIL.showLoading(root);
    try {
      const data = await apiGet('my-stores.php');
      const stores = Array.isArray(data.stores) ? data.stores : [];
      const store = stores.find((s) => Number(s.id) === storeId);
      if (!store) {
        root.innerHTML = `<div class="wwc-create-error">Store not found. <a href="my-office.html">My stores</a></div>`;
        return;
      }
      if (store.moderation_status !== 'approved') {
        root.innerHTML = `<div class="wwc-create-error">Products can only be added to approved stores. Status: ${escapeHtml(store.moderation_status || 'pending')}.</div>`;
        return;
      }
      state.storeName = store.name || 'Your store';
      renderForm();
    } catch (e) {
      WWC_UTIL.showError(root, e.message, init);
    }
  }

  WWC_PAGE.init({ requireAuth: true, onReady: init });
})();

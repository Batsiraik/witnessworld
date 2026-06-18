(function () {
  const { apiPost, apiGet } = WWC_API;
  const { qs, escapeHtml } = WWC_UTIL;
  const C = WWC_CREATE;
  const root = document.getElementById('create-root');

  const storeId = Number(qs('store_id') || 0);
  const state = { imageUrl: null, storeName: '' };

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
              <label>Product photo *</label>
              <div class="wwc-media-zone" id="image-zone" tabindex="0" role="button">
                <p>Tap to upload</p><small>Required · JPG, PNG or WebP</small>
                <input type="file" id="image-input" accept="image/jpeg,image/png,image/webp" />
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
      </div>`;

    const zone = document.getElementById('image-zone');
    const input = document.getElementById('image-input');
    const status = document.getElementById('image-status');
    zone?.addEventListener('click', () => input?.click());
    input?.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (status) { status.hidden = false; status.textContent = 'Uploading…'; }
      try {
        state.imageUrl = await C.uploadProductMedia(file, storeId);
        zone.classList.add('has-image');
        zone.innerHTML = `<img src="${WWC_UTIL.escapeAttr(WWC_API.resolveMediaUrl(state.imageUrl))}" alt="" />`;
        if (status) status.hidden = true;
      } catch (e) {
        if (status) { status.textContent = e.message; status.style.color = 'var(--wwc-danger)'; }
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

    if (!state.imageUrl) { C.showFormError(root, 'Add a product photo.'); return; }
    if (!name) { C.showFormError(root, 'Enter a product name.'); return; }
    if (!price || Number.isNaN(Number(price))) { C.showFormError(root, 'Enter a valid price.'); return; }
    if (!/^[A-Z]{3}$/.test(currency)) { C.showFormError(root, 'Use a 3-letter currency code like USD.'); return; }

    const body = {
      store_id: storeId,
      name,
      price_amount: price,
      currency,
      description: document.getElementById('description')?.value.trim() || '',
      specifications: document.getElementById('specs')?.value.trim() || '',
      image_url: state.imageUrl,
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

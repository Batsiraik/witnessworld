(function () {
  const type = document.body.dataset.detailType;
  const id = WWC_UTIL.qsInt('id');
  const root = document.getElementById('detail-root');
  const { escapeHtml, formatListingLoc, formatDirLoc, showLoading, showError } = WWC_UTIL;
  const { resolveMediaUrl, apiGet, apiPost } = WWC_API;
  const { imgHtml } = WWC_CARDS;

  let heartOn = false;
  let subjectType = '';
  let peerUserId = 0;

  const ENDPOINTS = {
    listing: { api: 'listing-public-detail.php', key: 'listing', fav: 'listing' },
    product: { api: 'product-public-detail.php', key: 'product', fav: 'product' },
    store: { api: 'store-public-detail.php', key: 'store', fav: 'store' },
    directory: { api: 'directory-detail.php', key: 'entry', fav: 'directory_entry' },
  };

  function reviewsHtml(summary, reviews) {
    if (!reviews?.length) return '';
    const avg = summary?.average_rating ? Number(summary.average_rating).toFixed(1) : '';
    let h = `<div class="wwc-detail-section"><h3>Reviews ${avg ? `<span class="wwc-review-stars">★ ${avg}</span>` : ''}</h3>`;
    reviews.slice(0, 5).forEach((r) => {
      h += `<div class="wwc-review"><div class="wwc-review-head"><span>${escapeHtml(r.author_label || 'Member')}</span><span class="wwc-review-stars">${'★'.repeat(Math.round(r.rating || 0))}</span></div><p>${escapeHtml(r.body || '')}</p></div>`;
    });
    return h + '</div>';
  }

  function sellerHtml(seller) {
    if (!seller) return '';
    const avatar = resolveMediaUrl(seller.avatar_url);
    return `
      <div class="wwc-detail-section">
        <h3>Seller</h3>
        <div class="wwc-seller-card">
          ${avatar ? `<img src="${WWC_UTIL.escapeAttr(avatar)}" alt="" />` : '<div class="wwc-card-placeholder" style="width:48px;height:48px;border-radius:50%"><ion-icon name="person-outline"></ion-icon></div>'}
          <div><div class="wwc-seller-name">${escapeHtml(seller.label || seller.username || 'Member')}</div><div class="wwc-seller-user">@${escapeHtml(seller.username || '')}</div></div>
        </div>
      </div>`;
  }

  function heroMedia(url, icon) {
    const inner = imgHtml(url, icon);
    if (inner.includes('<img')) return inner.replace('<img', '<img style="width:100%;height:100%;object-fit:cover"');
    return inner.replace('wwc-card-placeholder', 'wwc-card-placeholder" style="height:100%');
  }

  function moderationLabel(status) {
    const map = {
      approved: 'Live',
      pending_approval: 'Pending review',
      rejected: 'Not approved',
      removed: 'Removed',
      suspended: 'Suspended',
    };
    return map[status] || status || 'Unknown';
  }

  function ownerBannerHtml(L) {
    const mod = L.moderation_status || '';
    const hint = mod === 'pending_approval'
      ? '<span class="wwc-owner-banner__hint">Only you can see this until it is approved.</span>'
      : '';
    return `
      <div class="wwc-owner-banner wwc-owner-banner--${escapeHtml(mod)}">
        <strong>Your listing</strong> · ${escapeHtml(moderationLabel(mod))}
        ${hint}
      </div>`;
  }

  function renderListing(L, isOwner) {
    subjectType = 'listing';
    peerUserId = L.seller?.user_id || 0;
    const pt = L.pricing_type === 'hourly' ? '/hr' : '';
    const price = L.price_amount ? `${L.currency} ${L.price_amount}${pt}` : L.is_free ? 'Free' : '';
    const skills = (L.soft_skills || []).map((s) => `<span class="wwc-skill">${escapeHtml(s)}</span>`).join('');
    const portfolio = (L.portfolio_urls || []).map((u) => {
      const src = resolveMediaUrl(u);
      return src ? `<img src="${WWC_UTIL.escapeAttr(src)}" alt="" loading="lazy" />` : '';
    }).join('');
    const video = L.video_url ? resolveMediaUrl(L.video_url) : null;
    root.innerHTML = `
      ${isOwner ? ownerBannerHtml(L) : ''}
      <div class="wwc-detail-hero">${heroMedia(L.media_url, 'document-text-outline')}
        <div class="wwc-detail-hero-actions"><button type="button" class="wwc-icon-btn" id="fav-btn" aria-label="Favorite"><ion-icon name="heart${heartOn ? '' : '-outline'}"></ion-icon></button></div>
      </div>
      ${video ? `<div class="wwc-detail-body"><video src="${WWC_UTIL.escapeAttr(video)}" controls style="width:100%;border-radius:12px"></video></div>` : ''}
      <div class="wwc-detail-body">
        <div class="wwc-detail-tags"><span class="wwc-detail-tag">${escapeHtml(L.listing_type || 'Listing')}</span>${L.category_name ? `<span class="wwc-detail-tag">${escapeHtml(L.category_name)}</span>` : ''}${L.is_featured ? '<span class="wwc-detail-tag">Featured</span>' : ''}</div>
        <h1 class="wwc-detail-title">${escapeHtml(L.title)}</h1>
        ${price ? `<p class="wwc-detail-price">${escapeHtml(price)}</p>` : ''}
        <p class="wwc-detail-desc">${escapeHtml(L.description || '')}</p>
        ${skills ? `<div class="wwc-detail-section"><h3>Skills</h3><div class="wwc-skills">${skills}</div></div>` : ''}
        ${portfolio ? `<div class="wwc-detail-section"><h3>Portfolio</h3><div class="wwc-portfolio">${portfolio}</div></div>` : ''}
        ${sellerHtml(L.seller)}
        ${reviewsHtml(L.review_summary, L.reviews)}
      </div>
      <div class="wwc-detail-cta wwc-detail-cta-row">
        ${isOwner
          ? `<a href="create-listing.html?id=${L.id}" class="wwc-btn wwc-btn-purple">Edit listing</a>`
          : `<button type="button" class="wwc-btn wwc-btn-purple" id="contact-btn">Message seller</button>
             ${L.listing_type === 'service' ? `<a href="request.html?subject_type=listing&subject_id=${L.id}" class="wwc-btn wwc-btn-primary">Hire</a>` : ''}`}
      </div>`;
    document.title = `${L.title} · Witness World Connect`;
  }

  function renderProduct(P) {
    subjectType = 'product';
    peerUserId = P.seller?.user_id || 0;
    root.innerHTML = `
      <div class="wwc-detail-hero">${heroMedia(P.image_url, 'cube-outline')}
        <div class="wwc-detail-hero-actions"><button type="button" class="wwc-icon-btn" id="fav-btn"><ion-icon name="heart${heartOn ? '' : '-outline'}"></ion-icon></button></div>
      </div>
      <div class="wwc-detail-body">
        <h1 class="wwc-detail-title">${escapeHtml(P.name)}</h1>
        <p class="wwc-detail-price">${escapeHtml(P.currency)} ${escapeHtml(P.price_amount)}</p>
        <p class="wwc-detail-desc">${escapeHtml(P.description || '')}</p>
        ${P.specifications ? `<div class="wwc-detail-section"><h3>Specifications</h3><p class="wwc-detail-desc">${escapeHtml(P.specifications)}</p></div>` : ''}
        ${P.store_name ? `<p><a href="store.html?id=${P.store_id}" style="font-weight:800;color:var(--wwc-primary-dark)">${escapeHtml(P.store_name)}</a></p>` : ''}
        ${sellerHtml(P.seller)}
        ${reviewsHtml(P.review_summary, P.reviews)}
      </div>
      <div class="wwc-detail-cta wwc-detail-cta-row">
        <button type="button" class="wwc-btn wwc-btn-outline" id="cart-btn">Add to cart</button>
        <button type="button" class="wwc-btn wwc-btn-purple" id="contact-btn">Message seller</button>
      </div>`;
    document.title = `${P.name} · Witness World Connect`;
  }

  function renderStore(S) {
    subjectType = 'store';
    peerUserId = S.seller?.user_id || 0;
    const products = (S.products || []).map((p) => storeProductRow(p)).join('');
    root.innerHTML = `
      <div class="wwc-detail-hero">${heroMedia(S.banner_url || S.logo_url, 'storefront-outline')}
        <div class="wwc-detail-hero-actions"><button type="button" class="wwc-icon-btn" id="fav-btn"><ion-icon name="heart${heartOn ? '' : '-outline'}"></ion-icon></button></div>
      </div>
      <div class="wwc-detail-body">
        <h1 class="wwc-detail-title">${escapeHtml(S.name)}</h1>
        <p class="wwc-detail-desc">${escapeHtml(S.description || S.sells_summary || '')}</p>
        <p class="wwc-card-loc"><ion-icon name="location-outline"></ion-icon><span>${escapeHtml(formatListingLoc(S))}</span></p>
        ${sellerHtml(S.seller)}
        ${reviewsHtml(S.review_summary, S.reviews)}
        ${products ? `<div class="wwc-detail-section"><h3>Products</h3><div class="wwc-product-grid">${products}</div></div>` : ''}
      </div>
      <div class="wwc-detail-cta wwc-detail-cta-row"><button type="button" class="wwc-btn wwc-btn-purple" id="contact-btn">Message store</button></div>`;
    document.title = `${S.name} · Witness World Connect`;
  }

  function storeProductRow(p) {
    const src = resolveMediaUrl(p.image_url);
    const price = `${p.currency || 'USD'} ${p.price_amount || ''}`;
    return `
      <div class="wwc-store-product-row" data-product-id="${p.id}">
        ${src ? `<img src="${WWC_UTIL.escapeAttr(src)}" alt="" />` : '<div style="width:56px;height:56px;border-radius:10px;background:var(--wwc-primary-soft)"></div>'}
        <div class="wwc-store-product-row-info">
          <a href="product.html?id=${p.id}">${escapeHtml(p.name || 'Product')}</a>
          <p style="margin:4px 0 0;font-size:13px;font-weight:700;color:var(--wwc-primary-dark)">${escapeHtml(price)}</p>
        </div>
        <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-outline" data-add-cart>Add to cart</button>
      </div>`;
  }

  function renderDirectory(E) {
    subjectType = 'directory_entry';
    peerUserId = E.owner_user_id || 0;
    const links = [];
    if (E.phone) links.push(`<a href="tel:${escapeHtml(E.phone)}"><ion-icon name="call-outline"></ion-icon>${escapeHtml(E.phone)}</a>`);
    if (E.email) links.push(`<a href="mailto:${escapeHtml(E.email)}"><ion-icon name="mail-outline"></ion-icon>${escapeHtml(E.email)}</a>`);
    if (E.website) links.push(`<a href="${WWC_UTIL.escapeAttr(E.website)}" target="_blank" rel="noopener"><ion-icon name="globe-outline"></ion-icon>Website</a>`);
    if (E.map_url) links.push(`<a href="${WWC_UTIL.escapeAttr(E.map_url)}" target="_blank" rel="noopener"><ion-icon name="map-outline"></ion-icon>Map</a>`);
    root.innerHTML = `
      <div class="wwc-detail-hero">${heroMedia(E.logo_url, 'business-outline')}
        <div class="wwc-detail-hero-actions"><button type="button" class="wwc-icon-btn" id="fav-btn"><ion-icon name="heart${heartOn ? '' : '-outline'}"></ion-icon></button></div>
      </div>
      <div class="wwc-detail-body">
        ${E.category_name ? `<div class="wwc-detail-tags"><span class="wwc-detail-tag">${escapeHtml(E.category_name)}</span></div>` : ''}
        <h1 class="wwc-detail-title">${escapeHtml(E.business_name)}</h1>
        ${E.tagline ? `<p style="font-weight:700;color:var(--wwc-text-muted)">${escapeHtml(E.tagline)}</p>` : ''}
        <p class="wwc-detail-desc">${escapeHtml(E.description || '')}</p>
        <p class="wwc-card-loc"><ion-icon name="location-outline"></ion-icon><span>${escapeHtml(formatDirLoc(E))}</span></p>
        ${E.hours_text ? `<div class="wwc-detail-section"><h3>Hours</h3><p>${escapeHtml(E.hours_text)}</p></div>` : ''}
        ${links.length ? `<div class="wwc-detail-section"><h3>Contact</h3><div class="wwc-contact-links">${links.join('')}</div></div>` : ''}
        ${reviewsHtml(E.review_summary, E.reviews)}
      </div>
      <div class="wwc-detail-cta wwc-detail-cta-row">
        <button type="button" class="wwc-btn wwc-btn-purple" id="contact-btn">Message business</button>
        <a href="request.html?subject_type=directory_entry&subject_id=${E.id}" class="wwc-btn wwc-btn-primary">Hire</a>
      </div>`;
    document.title = `${E.business_name} · Witness World Connect`;
  }

  async function loadFavorite() {
    if (!WWC_AUTH.isLoggedIn() || !subjectType) return;
    try {
      const data = await apiGet(`favorite-status.php?subject_type=${subjectType}&subject_id=${id}`);
      heartOn = data.is_favorited === true;
      const icon = document.querySelector('#fav-btn ion-icon');
      if (icon) icon.setAttribute('name', heartOn ? 'heart' : 'heart-outline');
    } catch { /* */ }
  }

  async function toggleFavorite() {
    if (!WWC_AUTH.requireAuth('Sign in to save favorites.')) return;
    try {
      const data = await apiPost('favorite-toggle.php', { subject_type: subjectType, subject_id: id });
      heartOn = data.is_favorited === true;
      const icon = document.querySelector('#fav-btn ion-icon');
      if (icon) icon.setAttribute('name', heartOn ? 'heart' : 'heart-outline');
    } catch (e) {
      alert(e.message);
    }
  }

  async function openChat() {
    if (!WWC_AUTH.requireAuth('Sign in to message.')) return;
    const ctxMap = { listing: 'listing', product: 'product', store: 'store', directory_entry: 'directory_entry' };
    try {
      const data = await apiPost('conversation-open.php', {
        peer_user_id: peerUserId,
        context_type: ctxMap[subjectType],
        context_id: id,
      });
      const cid = data.conversation_id;
      if (cid) window.location.href = `chat.html?conversation_id=${cid}`;
      else alert('Could not start conversation.');
    } catch (e) {
      alert(e.message);
    }
  }

  function addToCart(product) {
    if (!window.WWC_CART) {
      alert('Cart is loading — please try again.');
      return;
    }
    const ok = WWC_CART.addProduct({
      subject_id: product.id,
      title: product.name || 'Product',
      image_url: product.image_url || null,
      unit_price: product.price_amount != null ? String(product.price_amount) : null,
      currency: product.currency || 'USD',
    });
    if (ok) {
      const go = confirm('Added to cart. View cart now?');
      if (go) window.location.href = 'cart.html';
    }
  }

  function bindActions(item, isOwner) {
    document.getElementById('fav-btn')?.addEventListener('click', toggleFavorite);
    if (!isOwner) {
      document.getElementById('contact-btn')?.addEventListener('click', openChat);
    }
    document.getElementById('cart-btn')?.addEventListener('click', () => addToCart(item));
    document.querySelectorAll('[data-add-cart]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const row = btn.closest('[data-product-id]');
        const pid = Number(row?.getAttribute('data-product-id'));
        const p = (item.products || []).find((x) => x.id === pid);
        if (p) addToCart(p);
      });
    });
  }

  async function fetchListingItem() {
    try {
      const data = await apiGet(`listing-public-detail.php?id=${id}`, true);
      return { item: data.listing, isOwner: false };
    } catch (e) {
      if (e.status !== 404 || !WWC_AUTH.isLoggedIn()) throw e;
      const data = await apiGet(`listing-detail.php?id=${id}`);
      const L = data.listing;
      if (!L) throw new Error('Listing not found');
      const user = WWC_AUTH.getUser();
      const label = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
      return {
        item: {
          ...L,
          seller: {
            user_id: user.id,
            username: user.username,
            label: label || user.username,
            avatar_url: user.avatar_url || null,
          },
        },
        isOwner: true,
      };
    }
  }

  async function load() {
    if (!id) {
      showError(root, 'Invalid link.');
      return;
    }
    const cfg = ENDPOINTS[type];
    if (!cfg) {
      showError(root, 'Unknown page type.');
      return;
    }
    showLoading(root);
    try {
      if (type === 'listing') {
        const { item, isOwner } = await fetchListingItem();
        if (!item) throw new Error('Not found');
        renderListing(item, isOwner);
        bindActions(item, isOwner);
        await loadFavorite();
        return;
      }
      const data = await apiGet(`${cfg.api}?id=${id}${type === 'store' ? '&products_limit=60' : ''}`, true);
      const item = data[cfg.key];
      if (!item) throw new Error('Not found');
      if (type === 'product') {
        if (data.seller) item.seller = data.seller;
        if (data.store) {
          item.store_name = data.store.name;
          item.store_id = data.store.id;
        }
        if (data.review_summary) {
          item.review_summary = data.review_summary;
          item.reviews = data.reviews;
        }
      }
      if (type === 'product') renderProduct(item);
      else if (type === 'store') renderStore(item);
      else renderDirectory(item);
      bindActions(item, false);
      await loadFavorite();
    } catch (e) {
      showError(root, e.message, load);
    }
  }

  WWC_PAGE.init({ onReady: load });
})();

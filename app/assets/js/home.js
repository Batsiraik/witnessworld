/**
 * Home page — feed, location filter, search, notifications badge.
 */
(function () {
  const { apiGet, apiPost, resolveMediaUrl } = window.WWC_API;
  const { requireAuth, isLoggedIn } = window.WWC_AUTH;

  const TOP_CATEGORIES = [
    { label: 'Marketplace', href: 'classifieds.html', icon: 'bag-handle-outline', bg: '#E8F4FD', color: '#1D4ED8' },
    { label: 'Services', href: 'services.html', icon: 'construct-outline', bg: '#F3E8FF', color: '#7C3AED' },
    { label: 'Community', href: 'community.html', icon: 'people-outline', bg: '#FEF3C7', color: '#B45309' },
    { label: 'Businesses', href: 'directory.html', icon: 'business-outline', bg: '#DCFCE7', color: '#15803D' },
    { label: 'Stores', href: 'stores.html', icon: 'storefront-outline', bg: '#FFEDD5', color: '#C2410C' },
  ];

  let countries = [];
  let usStates = [];
  let country = null;
  let usState = null;
  let feed = null;

  const els = {
    locBtn: document.getElementById('home-loc-btn'),
    locLabel: document.getElementById('home-loc-label'),
    search: document.getElementById('home-search'),
    cats: document.getElementById('home-cats'),
    feed: document.getElementById('home-feed'),
    notifBtn: document.getElementById('home-notif-btn'),
    notifBadge: document.getElementById('home-notif-badge'),
    favBtn: document.getElementById('home-fav-btn'),
    ordersBtn: document.getElementById('home-orders-btn'),
    locModal: document.getElementById('loc-modal'),
    locCountrySearch: document.getElementById('loc-country-search'),
    locCountryList: document.getElementById('loc-country-list'),
    locStateSection: document.getElementById('loc-state-section'),
    locStateList: document.getElementById('loc-state-list'),
    notifModal: document.getElementById('notif-modal'),
    notifList: document.getElementById('notif-list'),
  };

  function formatListingLoc(row) {
    const parts = [row.location_us_state, row.location_country_name].filter(Boolean);
    return parts.join(', ') || 'Location not set';
  }

  function formatDirLoc(row) {
    const parts = [row.city, row.location_us_state].filter(Boolean);
    return parts.join(', ') || formatListingLoc(row);
  }

  function locationLabel() {
    if (!country) return 'All locations';
    if (country.code === 'US' && usState) return `${usState.name}, ${country.name}`;
    return country.name;
  }

  function normalizeFeatured(raw) {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const kind = String(row.kind ?? '');
      if (kind === 'product' && row.product) out.push({ kind: 'product', product: row.product });
      else if (['service', 'classified', 'community'].includes(kind) && row.listing) {
        out.push({ kind, listing: row.listing });
      }
    }
    return out;
  }

  function normalizeFeed(raw) {
    if (!raw || typeof raw !== 'object') {
      return { services: [], products: [], classifieds: [], community: [], stores: [], directory: [], featured: [] };
    }
    const arr = (k) => (Array.isArray(raw[k]) ? raw[k] : []);
    return {
      services: arr('services'),
      products: arr('products'),
      classifieds: arr('classifieds'),
      community: arr('community'),
      stores: arr('stores'),
      directory: arr('directory'),
      featured: normalizeFeatured(raw.featured),
    };
  }

  function imgHtml(url, placeholderIcon) {
    const src = resolveMediaUrl(url);
    if (src) {
      return `<img src="${escapeAttr(src)}" alt="" loading="lazy" />`;
    }
    return `<div class="wwc-card-placeholder"><ion-icon name="${placeholderIcon}" aria-hidden="true"></ion-icon></div>`;
  }

  function flagsHtml(urgent, verified) {
    if (!urgent && !verified) return '';
    let html = '<div class="wwc-card-flags">';
    if (urgent) html += '<span class="wwc-flag wwc-flag-urgent">Urgent</span>';
    if (verified) html += '<span class="wwc-flag wwc-flag-verified">Verified</span>';
    html += '</div>';
    return html;
  }

  function cardListing(row, href) {
    const id = Number(row.id);
    const title = escapeHtml(String(row.title ?? ''));
    const media = row.media_url;
    const price = row.price_amount != null ? String(row.price_amount) : null;
    const cur = String(row.currency ?? 'USD');
    const pt = String(row.pricing_type ?? 'fixed');
    const loc = escapeHtml(formatListingLoc(row));
    const featured = row.is_featured === true;
    const urgent = row.is_urgent === true;
    const verified = row.is_verified === true;
    const priceHtml = price
      ? `<p class="wwc-card-price">${cur} ${escapeHtml(price)}${pt === 'hourly' ? '/hr' : ''}</p>`
      : `<p class="wwc-card-meta">See listing</p>`;

    return `
      <a href="${href}?id=${id}" class="wwc-card${featured ? ' is-featured' : ''}${urgent ? ' is-urgent' : ''}">
        <div class="wwc-card-img-wrap">
          ${imgHtml(media, 'document-text-outline')}
          ${featured ? '<span class="wwc-featured-badge">Featured</span>' : ''}
        </div>
        ${flagsHtml(urgent, verified)}
        <p class="wwc-card-title">${title}</p>
        ${priceHtml}
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
      </a>`;
  }

  function cardProduct(row) {
    const id = Number(row.id);
    const name = escapeHtml(String(row.name ?? ''));
    const price = String(row.price_amount ?? '');
    const cur = String(row.currency ?? 'USD');
    const loc = escapeHtml(formatListingLoc(row));
    return `
      <a href="product.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.image_url, 'cube-outline')}</div>
        <p class="wwc-card-title">${name}</p>
        <p class="wwc-card-price">${cur} ${escapeHtml(price)}</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
      </a>`;
  }

  function cardStore(row) {
    const id = Number(row.id);
    const name = escapeHtml(String(row.name ?? ''));
    const loc = escapeHtml(formatListingLoc(row));
    return `
      <a href="store.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.logo_url, 'storefront-outline')}</div>
        <p class="wwc-card-title">${name}</p>
        <p class="wwc-card-meta">Store</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
      </a>`;
  }

  function cardDirectory(row) {
    const id = Number(row.id);
    const name = escapeHtml(String(row.business_name ?? ''));
    const loc = escapeHtml(formatDirLoc(row));
    return `
      <a href="directory-entry.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.logo_url, 'business-outline')}</div>
        <p class="wwc-card-title">${name}</p>
        <p class="wwc-card-meta">Business</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
      </a>`;
  }

  function featuredCard(item, showBadge) {
    if (item.kind === 'product' && item.product) {
      const row = item.product;
      const id = Number(row.id);
      const name = escapeHtml(String(row.name ?? ''));
      const price = String(row.price_amount ?? '');
      const cur = String(row.currency ?? 'USD');
      const loc = escapeHtml(formatListingLoc(row));
      const badge = showBadge ? '<span class="wwc-featured-badge">Featured</span>' : '';
      return `
        <a href="product.html?id=${id}" class="wwc-card${showBadge ? ' is-featured' : ''}">
          <div class="wwc-card-img-wrap">${imgHtml(row.image_url, 'cube-outline')}${badge}</div>
          <p class="wwc-card-title">${name}</p>
          <p class="wwc-card-price">${cur} ${escapeHtml(price)}</p>
          <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
        </a>`;
    }
    if (item.listing) {
      const row = item.listing;
      const featured = row.is_featured === true || showBadge;
      const id = Number(row.id);
      const title = escapeHtml(String(row.title ?? ''));
      const media = row.media_url;
      const price = row.price_amount != null ? String(row.price_amount) : null;
      const cur = String(row.currency ?? 'USD');
      const pt = String(row.pricing_type ?? 'fixed');
      const loc = escapeHtml(formatListingLoc(row));
      const urgent = row.is_urgent === true;
      const verified = row.is_verified === true;
      const priceHtml = price
        ? `<p class="wwc-card-price">${cur} ${escapeHtml(price)}${pt === 'hourly' ? '/hr' : ''}</p>`
        : `<p class="wwc-card-meta">See listing</p>`;
      return `
        <a href="listing.html?id=${id}" class="wwc-card${featured ? ' is-featured' : ''}${urgent ? ' is-urgent' : ''}">
          <div class="wwc-card-img-wrap">
            ${imgHtml(media, 'document-text-outline')}
            ${featured ? '<span class="wwc-featured-badge">Featured</span>' : ''}
          </div>
          ${flagsHtml(urgent, verified)}
          <p class="wwc-card-title">${title}</p>
          ${priceHtml}
          <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
        </a>`;
    }
    return '';
  }

  function rail(title, seeHref, cardsHtml) {
    if (!cardsHtml.trim()) return '';
    return `
      <section class="wwc-rail">
        <div class="wwc-rail-head">
          <h2 class="wwc-rail-title">${escapeHtml(title)}</h2>
          <a href="${seeHref}" class="wwc-rail-see">See all &gt;</a>
        </div>
        <div class="wwc-rail-scroll">${cardsHtml}</div>
      </section>`;
  }

  function renderFeed() {
    if (!feed) return;
    const parts = [];

    if (feed.featured.length) {
      parts.push(
        rail('Featured', 'services.html', feed.featured.map((f) => featuredCard(f, true)).join(''))
      );
    }

    if (feed.classifieds.length || feed.stores.length) {
      const rec = [
        ...feed.classifieds.slice(0, 6).map((r) => cardListing(r, 'listing.html')),
        ...feed.stores.slice(0, 4).map((r) => cardStore(r)),
      ].join('');
      parts.push(rail('Recommended', 'classifieds.html', rec));
    }

    if (feed.services.length) {
      parts.push(
        rail('Service marketplace', 'services.html', feed.services.map((r) => cardListing(r, 'listing.html')).join(''))
      );
    }
    if (feed.community.length) {
      parts.push(
        rail('Community', 'community.html', feed.community.map((r) => cardListing(r, 'listing.html')).join(''))
      );
    }
    if (feed.products.length) {
      parts.push(rail('Products', 'products.html', feed.products.map((r) => cardProduct(r)).join('')));
    }
    if (feed.classifieds.length) {
      parts.push(
        rail('Classifieds', 'classifieds.html', feed.classifieds.map((r) => cardListing(r, 'listing.html')).join(''))
      );
    }
    if (feed.stores.length) {
      parts.push(rail('Online stores', 'stores.html', feed.stores.map((r) => cardStore(r)).join('')));
    }
    if (feed.directory.length) {
      parts.push(
        rail('Business directory', 'directory.html', feed.directory.map((r) => cardDirectory(r)).join(''))
      );
    }

    els.feed.innerHTML = parts.join('') || '<p class="wwc-footnote">No listings yet. Check back soon.</p>';
  }

  async function loadLocations() {
    try {
      const data = await apiGet('locations.php', true);
      if (Array.isArray(data.countries)) countries = data.countries;
      if (Array.isArray(data.us_states)) usStates = data.us_states;
    } catch {
      /* optional */
    }
  }

  async function loadFeed() {
    els.feed.innerHTML = '<div class="wwc-loading"><div class="wwc-spinner" role="status" aria-label="Loading"></div></div>';
    try {
      const qs = new URLSearchParams({ section: 'all', limit: '12' });
      if (country?.code) qs.set('country', country.code);
      if (usState?.name) qs.set('us_state', usState.name);
      const data = await apiGet(`marketplace-home-feed.php?${qs}`, true);
      feed = normalizeFeed(data.feed);
      renderFeed();
    } catch (e) {
      els.feed.innerHTML = `
        <div>
          <p class="wwc-feed-error">${escapeHtml(e.message || 'Could not load feed')}</p>
          <button type="button" class="wwc-feed-retry" id="feed-retry">Try again</button>
        </div>`;
      document.getElementById('feed-retry')?.addEventListener('click', loadFeed);
    }
  }

  async function loadNotifBadge() {
    if (!isLoggedIn()) {
      els.notifBadge.hidden = true;
      return;
    }
    try {
      const data = await apiGet('user-notifications.php');
      const n = typeof data.unread_count === 'number' ? data.unread_count : 0;
      els.notifBadge.hidden = n <= 0;
    } catch {
      els.notifBadge.hidden = true;
    }
  }

  function renderCategories() {
    els.cats.innerHTML = TOP_CATEGORIES.map(
      (c) => `
      <a href="${c.href}" class="wwc-cat">
        <span class="wwc-cat-icon" style="background:${c.bg}">
          <ion-icon name="${c.icon}" style="color:${c.color}" aria-hidden="true"></ion-icon>
        </span>
        <span class="wwc-cat-label">${c.label}</span>
      </a>`
    ).join('');
  }

  function updateLocLabel() {
    els.locLabel.textContent = locationLabel();
  }

  function openModal(el) {
    el.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal(el) {
    el.hidden = true;
    document.body.style.overflow = '';
  }

  function renderCountryList(filter) {
    const q = (filter || '').trim().toLowerCase();
    const list = q
      ? countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      : countries;
    els.locCountryList.innerHTML = list
      .map(
        (c) =>
          `<button type="button" class="wwc-modal-row" data-code="${escapeAttr(c.code)}">${escapeHtml(c.name)} (${escapeHtml(c.code)})</button>`
      )
      .join('');
    els.locCountryList.querySelectorAll('[data-code]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        country = countries.find((c) => c.code === code) || null;
        usState = null;
        updateLocLabel();
        renderStateList();
        if (country?.code !== 'US') {
          closeModal(els.locModal);
          loadFeed();
        }
      });
    });
  }

  function renderStateList() {
    if (country?.code !== 'US') {
      els.locStateSection.hidden = true;
      return;
    }
    els.locStateSection.hidden = false;
    const items = [{ code: '', name: 'All states' }, ...usStates];
    els.locStateList.innerHTML = items
      .map(
        (s, i) =>
          `<button type="button" class="wwc-modal-row" data-idx="${i}">${escapeHtml(s.name)}</button>`
      )
      .join('');
    els.locStateList.querySelectorAll('[data-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-idx'));
        const item = idx === 0 ? null : usStates[idx - 1];
        usState = item;
        updateLocLabel();
        closeModal(els.locModal);
        loadFeed();
      });
    });
  }

  async function openNotifications() {
    if (!requireAuth('Sign in to view notifications.')) return;
    openModal(els.notifModal);
    els.notifList.innerHTML = '<div class="wwc-loading"><div class="wwc-spinner"></div></div>';
    try {
      const data = await apiGet('user-notifications.php');
      const items = Array.isArray(data.notifications) ? data.notifications : [];
      if (!items.length) {
        els.notifList.innerHTML = '<p class="wwc-notif-empty">No notifications yet.</p>';
      } else {
        els.notifList.innerHTML = items
          .map((n) => {
            const unread = !n.is_read;
            return `
            <div class="wwc-notif-item${unread ? ' is-unread' : ''}">
              <div class="wwc-notif-title">${escapeHtml(n.title || 'Notification')}</div>
              <div class="wwc-notif-body">${escapeHtml(n.body || '')}</div>
              <div class="wwc-notif-time">${escapeHtml(formatTime(n.created_at))}</div>
            </div>`;
          })
          .join('');
      }
      try {
        await apiPost('user-notifications-read.php', {});
      } catch {
        /* ignore */
      }
      els.notifBadge.hidden = true;
    } catch (e) {
      els.notifList.innerHTML = `<p class="wwc-feed-error">${escapeHtml(e.message)}</p>`;
    }
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function bindEvents() {
    els.locBtn.addEventListener('click', () => {
      renderCountryList(els.locCountrySearch.value);
      renderStateList();
      openModal(els.locModal);
    });

    els.locCountrySearch.addEventListener('input', () => renderCountryList(els.locCountrySearch.value));

    els.locModal.addEventListener('click', (e) => {
      if (e.target === els.locModal) closeModal(els.locModal);
    });
    els.locModal.querySelector('[data-loc-all]')?.addEventListener('click', () => {
      country = null;
      usState = null;
      updateLocLabel();
      closeModal(els.locModal);
      loadFeed();
    });
    els.locModal.querySelector('[data-loc-done]')?.addEventListener('click', () => closeModal(els.locModal));

    els.notifModal.addEventListener('click', (e) => {
      if (e.target === els.notifModal) closeModal(els.notifModal);
    });
    els.notifModal.querySelector('[data-notif-close]')?.addEventListener('click', () => closeModal(els.notifModal));

    els.notifBtn.addEventListener('click', openNotifications);
    els.favBtn.addEventListener('click', () => {
      if (requireAuth()) window.location.href = 'favorites.html';
    });
    els.ordersBtn.addEventListener('click', () => {
      if (requireAuth()) window.location.href = 'orders.html';
    });

    els.search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = els.search.value.trim();
        if (q) window.location.href = `services.html?q=${encodeURIComponent(q)}`;
      }
    });
  }

  async function init() {
    renderCategories();
    updateLocLabel();
    bindEvents();
    await loadLocations();
    await loadFeed();
    await loadNotifBadge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

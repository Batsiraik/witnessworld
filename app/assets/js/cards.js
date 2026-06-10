(function (global) {
  const { escapeHtml, escapeAttr, formatListingLoc, formatDirLoc } = global.WWC_UTIL;
  const { resolveMediaUrl } = global.WWC_API;

  function imgHtml(url, placeholderIcon) {
    const src = resolveMediaUrl(url);
    if (src) return `<img src="${escapeAttr(src)}" alt="" loading="lazy" />`;
    return `<div class="wwc-card-placeholder"><ion-icon name="${placeholderIcon}" aria-hidden="true"></ion-icon></div>`;
  }

  function flagsHtml(urgent, verified) {
    if (!urgent && !verified) return '';
    let h = '<div class="wwc-card-flags">';
    if (urgent) h += '<span class="wwc-flag wwc-flag-urgent">Urgent</span>';
    if (verified) h += '<span class="wwc-flag wwc-flag-verified">Verified</span>';
    h += '</div>';
    return h;
  }

  function listingCard(row, href) {
    const id = Number(row.id);
    const title = escapeHtml(String(row.title ?? ''));
    const price = row.price_amount != null ? String(row.price_amount) : null;
    const cur = String(row.currency ?? 'USD');
    const pt = String(row.pricing_type ?? 'fixed');
    const loc = escapeHtml(formatListingLoc(row));
    const featured = row.is_featured === true;
    const urgent = row.is_urgent === true;
    const verified = row.is_verified === true;
    const priceHtml = price
      ? `<p class="wwc-card-price">${cur} ${escapeHtml(price)}${pt === 'hourly' ? '/hr' : ''}</p>`
      : `<p class="wwc-card-meta">View</p>`;
    return `
      <a href="${href}?id=${id}" class="wwc-card${featured ? ' is-featured' : ''}${urgent ? ' is-urgent' : ''}">
        <div class="wwc-card-img-wrap">${imgHtml(row.media_url, 'document-text-outline')}${featured ? '<span class="wwc-featured-badge">Featured</span>' : ''}</div>
        ${flagsHtml(urgent, verified)}
        <p class="wwc-card-title">${title}</p>${priceHtml}
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${loc}</span></div>
      </a>`;
  }

  function productCard(row) {
    const id = Number(row.id);
    return `
      <a href="product.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.image_url, 'cube-outline')}</div>
        <p class="wwc-card-title">${escapeHtml(String(row.name ?? ''))}</p>
        <p class="wwc-card-price">${escapeHtml(String(row.currency ?? 'USD'))} ${escapeHtml(String(row.price_amount ?? ''))}</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${escapeHtml(formatListingLoc(row))}</span></div>
      </a>`;
  }

  function storeCard(row) {
    const id = Number(row.id);
    return `
      <a href="store.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.logo_url, 'storefront-outline')}</div>
        <p class="wwc-card-title">${escapeHtml(String(row.name ?? ''))}</p>
        <p class="wwc-card-meta">Store</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${escapeHtml(formatListingLoc(row))}</span></div>
      </a>`;
  }

  function directoryCard(row) {
    const id = Number(row.id);
    return `
      <a href="directory-entry.html?id=${id}" class="wwc-card">
        <div class="wwc-card-img-wrap">${imgHtml(row.logo_url, 'business-outline')}</div>
        <p class="wwc-card-title">${escapeHtml(String(row.business_name ?? ''))}</p>
        <p class="wwc-card-meta">Business</p>
        <div class="wwc-card-loc"><ion-icon name="location-outline" aria-hidden="true"></ion-icon><span>${escapeHtml(formatDirLoc(row))}</span></div>
      </a>`;
  }

  function gridCard(row, kind) {
    if (kind === 'product') return productCard(row);
    if (kind === 'store') return storeCard(row);
    if (kind === 'directory') return directoryCard(row);
    return listingCard(row, 'listing.html');
  }

  global.WWC_CARDS = { listingCard, productCard, storeCard, directoryCard, gridCard, imgHtml, flagsHtml };
})(window);

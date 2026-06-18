(function () {
  const { apiGet } = WWC_API;
  const { escapeHtml } = WWC_UTIL;
  const root = document.getElementById('office-root');

  function statusLabel(s) {
    const map = {
      approved: 'Approved',
      pending_approval: 'Pending review',
      rejected: 'Not approved',
      suspended: 'Suspended',
    };
    return map[s] || s || 'Unknown';
  }

  function statusColor(s) {
    if (s === 'approved') return 'var(--wwc-primary-dark)';
    if (s === 'pending_approval') return '#b45309';
    return 'var(--wwc-danger)';
  }

  async function load() {
    WWC_UTIL.showLoading(root);
    try {
      const [storesData, listingsData, dirData] = await Promise.all([
        apiGet('my-stores.php'),
        apiGet('my-listings.php'),
        apiGet('my-directory-entries.php'),
      ]);

      const stores = Array.isArray(storesData.stores) ? storesData.stores : [];
      const listings = Array.isArray(listingsData.listings) ? listingsData.listings : [];
      const entries = Array.isArray(dirData.entries) ? dirData.entries : [];

      root.innerHTML = `
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">My office</h1>
        <p style="color:var(--wwc-text-muted);font-weight:600;margin:0 0 20px">Manage your listings, stores, and directory entries.</p>

        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h2 style="margin:0;font-size:16px;font-weight:800">Online stores</h2>
            <a href="create-store.html" class="wwc-btn wwc-btn-sm wwc-btn-primary" style="padding:8px 12px;font-size:12px">+ Store</a>
          </div>
          ${stores.length ? stores.map(storeCard).join('') : '<p style="color:var(--wwc-text-muted);font-weight:600;font-size:14px">No stores yet.</p>'}
        </div>

        <div style="margin-bottom:24px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h2 style="margin:0;font-size:16px;font-weight:800">Listings</h2>
            <a href="post.html" class="wwc-btn wwc-btn-sm wwc-btn-ghost" style="padding:8px 12px;font-size:12px">+ Ad</a>
          </div>
          ${listings.length ? listings.map(listingCard).join('') : '<p style="color:var(--wwc-text-muted);font-weight:600;font-size:14px">No listings yet.</p>'}
        </div>

        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <h2 style="margin:0;font-size:16px;font-weight:800">Directory entries</h2>
            <a href="create-directory.html" class="wwc-btn wwc-btn-sm wwc-btn-ghost" style="padding:8px 12px;font-size:12px">+ Business</a>
          </div>
          ${entries.length ? entries.map(dirCard).join('') : '<p style="color:var(--wwc-text-muted);font-weight:600;font-size:14px">No directory entries yet.</p>'}
        </div>`;
    } catch (e) {
      WWC_UTIL.showError(root, e.message, load);
    }
  }

  function storeCard(s) {
    const logo = s.logo_url ? WWC_API.resolveMediaUrl(s.logo_url) : '';
    const approved = s.moderation_status === 'approved';
    return `
      <div class="wwc-card" style="display:flex;gap:14px;padding:14px;margin-bottom:10px;align-items:center">
        <div style="width:52px;height:52px;border-radius:12px;overflow:hidden;background:var(--wwc-primary-soft);flex-shrink:0">
          ${logo ? `<img src="${WWC_UTIL.escapeAttr(logo)}" alt="" style="width:100%;height:100%;object-fit:cover" />` : ''}
        </div>
        <div style="flex:1;min-width:0">
          <p style="margin:0;font-weight:800;font-size:15px">${escapeHtml(s.name || 'Store')}</p>
          <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:${statusColor(s.moderation_status)}">${escapeHtml(statusLabel(s.moderation_status))}</p>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
          ${approved ? `<a href="create-product.html?store_id=${s.id}" class="wwc-btn wwc-btn-sm wwc-btn-primary" style="padding:8px 10px;font-size:11px;white-space:nowrap">+ Product</a>` : ''}
          ${approved ? `<a href="store.html?id=${s.id}" class="wwc-btn wwc-btn-sm wwc-btn-ghost" style="padding:8px 10px;font-size:11px">View</a>` : ''}
        </div>
      </div>`;
  }

  function listingCard(l) {
    const type = l.listing_type === 'service' ? 'Service' : l.listing_type === 'community' ? 'Community' : 'Marketplace';
    return `
      <div class="wwc-card" style="padding:14px;margin-bottom:10px">
        <p style="margin:0;font-size:11px;font-weight:800;text-transform:uppercase;color:var(--wwc-text-muted)">${escapeHtml(type)}</p>
        <p style="margin:4px 0 0;font-weight:800">${escapeHtml(l.title || 'Listing')}</p>
        <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:${statusColor(l.moderation_status)}">${escapeHtml(statusLabel(l.moderation_status))}</p>
        ${l.id ? `<a href="listing.html?id=${l.id}" style="font-size:13px;font-weight:800;color:var(--wwc-primary-dark);margin-top:8px;display:inline-block">View</a>` : ''}
      </div>`;
  }

  function dirCard(d) {
    return `
      <div class="wwc-card" style="padding:14px;margin-bottom:10px">
        <p style="margin:0;font-weight:800">${escapeHtml(d.business_name || 'Business')}</p>
        <p style="margin:4px 0 0;font-size:12px;font-weight:700;color:${statusColor(d.moderation_status)}">${escapeHtml(statusLabel(d.moderation_status))}</p>
        ${d.id ? `<a href="directory-entry.html?id=${d.id}" style="font-size:13px;font-weight:800;color:var(--wwc-primary-dark);margin-top:8px;display:inline-block">View</a>` : ''}
      </div>`;
  }

  WWC_PAGE.init({ requireAuth: true, onReady: load });
})();

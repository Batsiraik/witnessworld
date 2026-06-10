(function () {
  const { escapeHtml } = WWC_UTIL;
  const root = document.getElementById('post-root');

  const ROWS = [
    { title: 'Marketplace listing', sub: 'Sell products or items', href: 'create-listing.html?type=classified', icon: 'bag-handle-outline', bg: '#E8F4FD', color: '#1D4ED8' },
    { title: 'Service listing', sub: 'Offer a skill or service', href: 'create-listing.html?type=service', icon: 'construct-outline', bg: '#F3E8FF', color: '#7C3AED' },
    { title: 'Community post', sub: 'Share with the community', href: 'create-listing.html?type=community', icon: 'people-outline', bg: '#FEF3C7', color: '#B45309' },
    { title: 'Online store', sub: 'Open a storefront', href: 'create-store.html', icon: 'storefront-outline', bg: '#FFEDD5', color: '#C2410C' },
    { title: 'Business directory', sub: 'List your business', href: 'create-directory.html', icon: 'business-outline', bg: '#DCFCE7', color: '#15803D' },
  ];

  function render() {
    const user = WWC_AUTH.getUser();
    const sub = WWC_AUTH.getSubscription();
    const hasAvatar = !!(user?.avatar_url && String(user.avatar_url).trim());
    let notice = '';
    if (!hasAvatar) notice = '<p class="wwc-feed-error" style="margin-bottom:16px">Upload a profile photo in Profile before posting.</p>';
    const monetization = sub?.monetization_enabled === true;
    if (monetization && sub?.features?.can_post !== true) {
      notice = '<p class="wwc-feed-error" style="margin-bottom:16px">Posting requires a paid plan when monetization is enabled.</p>';
    }
    root.innerHTML = `
      ${notice}
      <p style="color:var(--wwc-text-muted);font-weight:600;margin:0 0 16px">What would you like to post?</p>
      ${ROWS.map((r) => `
        <a href="${r.href}" class="wwc-card" style="display:flex;align-items:center;gap:14px;padding:16px;margin-bottom:12px">
          <span style="width:52px;height:52px;border-radius:14px;background:${r.bg};display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <ion-icon name="${r.icon}" style="font-size:26px;color:${r.color}"></ion-icon>
          </span>
          <div>
            <p style="margin:0;font-weight:800;font-size:16px">${escapeHtml(r.title)}</p>
            <p style="margin:4px 0 0;font-size:13px;color:var(--wwc-text-muted);font-weight:600">${escapeHtml(r.sub)}</p>
          </div>
        </a>`).join('')}`;
  }

  WWC_PAGE.init({
    requireAuth: true,
    onReady: render,
  });
})();

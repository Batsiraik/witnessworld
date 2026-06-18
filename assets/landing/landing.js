(function () {
  const APP = 'app';

  function appUrl(path) {
    const base = APP.endsWith('/') ? APP : APP + '/';
    return base + (path || '').replace(/^\//, '');
  }

  function goSearch(q) {
    const query = (q || '').trim();
    if (!query) {
      window.location.href = appUrl('index.html');
      return;
    }
    window.location.href = appUrl(`services.html?q=${encodeURIComponent(query)}`);
  }

  const form = document.getElementById('hero-search-form');
  const input = document.getElementById('hero-search-input');
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    goSearch(input?.value || '');
  });

  document.querySelectorAll('[data-search-tag]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      goSearch(el.getAttribute('data-search-tag') || '');
    });
  });

  const menuBtn = document.getElementById('menu-btn');
  const drawer = document.getElementById('mobile-drawer');
  const closeBtn = document.getElementById('drawer-close');

  function openDrawer() {
    drawer?.classList.add('is-open');
    drawer?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('is-open');
    drawer?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  menuBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  drawer?.addEventListener('click', (e) => {
    if (e.target === drawer) closeDrawer();
  });

  const heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    heroVideo.addEventListener('canplay', () => {
      heroVideo.style.opacity = '1';
    });
    heroVideo.addEventListener('error', () => {
      heroVideo.remove();
    });
    if (heroVideo.readyState >= 2) {
      heroVideo.style.opacity = '1';
    }
  }
})();

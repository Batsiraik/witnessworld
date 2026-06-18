(function () {
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

  const hero = document.querySelector('.wwc-hero');
  const poster = hero?.getAttribute('data-hero-poster');
  if (hero && poster) {
    hero.style.setProperty('--hero-poster-img', `url("${poster}")`);
  }

  const video = document.getElementById('hero-video');
  if (video && hero) {
    video.addEventListener('error', () => {
      hero.classList.add('wwc-hero-no-video');
    });
  }
})();

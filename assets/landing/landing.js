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

  const heroVideo = document.getElementById('hero-video');
  if (heroVideo) {
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.volume = 0;

    const showVideo = () => {
      heroVideo.style.opacity = '1';
    };
    heroVideo.addEventListener('loadeddata', showVideo);
    heroVideo.addEventListener('canplay', showVideo);
    heroVideo.addEventListener('error', () => {
      heroVideo.remove();
    });
    if (heroVideo.readyState >= 2) {
      showVideo();
    }
    void heroVideo.play().catch(() => {
      /* autoplay blocked — poster + gradient still show */
    });
  }
})();

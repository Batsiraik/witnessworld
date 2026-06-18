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

  function initHeroVideo() {
    const video = document.getElementById('hero-video');
    const hero = video?.closest('.wwc-hero');
    if (!video || !hero) return;

    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.setAttribute('muted', '');

    const reveal = () => {
      video.classList.add('is-playing');
    };

    const fail = () => {
      hero.classList.add('wwc-hero-no-video');
    };

    video.addEventListener('playing', reveal);
    video.addEventListener('canplay', reveal);
    video.addEventListener('error', fail);

    const tryPlay = () => {
      video.muted = true;
      const p = video.play();
      if (p && typeof p.then === 'function') {
        p.then(reveal).catch(() => {
          if (video.readyState >= 2) reveal();
        });
      } else if (video.readyState >= 2) {
        reveal();
      }
    };

    if (video.readyState >= 2) {
      reveal();
      tryPlay();
    } else {
      video.addEventListener('loadeddata', tryPlay, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroVideo);
  } else {
    initHeroVideo();
  }
})();

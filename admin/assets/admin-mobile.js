(function () {
  var sidebar = document.getElementById('admin-sidebar');
  var backdrop = document.getElementById('admin-sidebar-backdrop');
  var toggle = document.getElementById('admin-menu-toggle');
  var closeBtn = document.getElementById('admin-sidebar-close');
  if (!sidebar || !backdrop || !toggle) return;

  function openNav() {
    sidebar.classList.add('is-open');
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('admin-nav-open');
    toggle.setAttribute('aria-expanded', 'true');
  }

  function closeNav() {
    sidebar.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('admin-nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  function isMobile() {
    return window.matchMedia('(max-width: 1023px)').matches;
  }

  toggle.addEventListener('click', function () {
    if (sidebar.classList.contains('is-open')) closeNav();
    else openNav();
  });

  backdrop.addEventListener('click', closeNav);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);

  sidebar.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (isMobile()) closeNav();
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  window.addEventListener('resize', function () {
    if (!isMobile()) closeNav();
  });

  /* Auto-label table cells from header text (mobile cards) */
  function labelTables() {
    document.querySelectorAll('main .overflow-x-auto table').forEach(function (table) {
      var headers = [];
      table.querySelectorAll('thead th').forEach(function (th, i) {
        headers[i] = (th.textContent || '').trim();
      });
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        tr.querySelectorAll('td').forEach(function (td, i) {
          if (headers[i] && !td.getAttribute('data-label')) {
            td.setAttribute('data-label', headers[i]);
          }
        });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', labelTables);
  } else {
    labelTables();
  }

  /* Customer support: scroll to latest message when opening a thread on mobile */
  function scrollSupportMessages() {
    var box = document.querySelector('.admin-support-messages');
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }

  if (document.querySelector('.admin-support-chat-open')) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', scrollSupportMessages);
    } else {
      scrollSupportMessages();
    }
  }
})();

(function () {
  var modal = document.getElementById('admin-user-confirm-modal');
  if (!modal) return;

  var form = document.getElementById('admin-user-confirm-form');
  var titleEl = document.getElementById('admin-user-confirm-title');
  var msgEl = document.getElementById('admin-user-confirm-message');
  var actionInput = document.getElementById('admin-user-confirm-action');
  var returnInput = document.getElementById('admin-user-confirm-return');
  var submitBtn = document.getElementById('admin-user-confirm-submit');
  if (!form || !titleEl || !msgEl || !actionInput || !returnInput || !submitBtn) return;

  var userPhpBase = modal.getAttribute('data-user-php-base') || 'user.php';

  function openModal(cfg) {
    titleEl.textContent = cfg.title || 'Confirm action';
    msgEl.textContent = cfg.message || '';
    actionInput.value = cfg.action || '';
    returnInput.value = cfg.returnTo || '';
    form.action = userPhpBase + '?id=' + encodeURIComponent(String(cfg.userId || ''));
    submitBtn.textContent = cfg.submitLabel || 'Confirm';
    submitBtn.className = 'admin-btn ' + (cfg.submitClass || 'admin-btn--danger');
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  modal.querySelectorAll('.js-admin-user-confirm-cancel, .js-admin-user-confirm-backdrop').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  document.addEventListener('click', function (e) {
    var suspendBtn = e.target.closest('.js-admin-user-suspend');
    if (suspendBtn) {
      e.preventDefault();
      var name = suspendBtn.getAttribute('data-user-name') || 'this user';
      openModal({
        title: 'Suspend user?',
        message:
          'You are about to suspend ' +
          name +
          '. They will be set back to pending verification, signed out of the app, and must be approved again before using Witness World Connect.',
        action: 'suspend',
        userId: suspendBtn.getAttribute('data-user-id'),
        returnTo: suspendBtn.getAttribute('data-return') || '',
        submitLabel: 'Suspend user',
        submitClass: 'admin-btn--warning',
      });
      return;
    }

    var deleteBtn = e.target.closest('.js-admin-user-delete');
    if (deleteBtn) {
      e.preventDefault();
      var dname = deleteBtn.getAttribute('data-user-name') || 'this user';
      openModal({
        title: 'Delete user permanently?',
        message:
          'You are about to permanently delete ' +
          dname +
          ' and related app data (listings, messages, stores, etc.). This cannot be undone.',
        action: 'delete',
        userId: deleteBtn.getAttribute('data-user-id'),
        returnTo: deleteBtn.getAttribute('data-return') || '',
        submitLabel: 'Delete permanently',
        submitClass: 'admin-btn--danger',
      });
    }
  });
})();

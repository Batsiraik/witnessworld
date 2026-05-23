(function () {
  var modal = document.getElementById('admin-content-confirm-modal');
  if (!modal) return;

  var form = document.getElementById('admin-content-confirm-form');
  var titleEl = document.getElementById('admin-content-confirm-title');
  var msgEl = document.getElementById('admin-content-confirm-message');
  var actionInput = document.getElementById('admin-content-confirm-action');
  var returnInput = document.getElementById('admin-content-confirm-return');
  var submitBtn = document.getElementById('admin-content-confirm-submit');
  if (!form || !titleEl || !msgEl || !actionInput || !returnInput || !submitBtn) return;

  var typeLabels = {
    listing: 'listing',
    store: 'store',
    product: 'product',
    directory: 'directory listing',
  };

  function openModal(cfg) {
    var kind = typeLabels[cfg.entityType] || 'item';
    titleEl.textContent = cfg.title || 'Confirm action';
    msgEl.textContent = cfg.message || '';
    actionInput.value = cfg.action || '';
    returnInput.value = cfg.returnTo || '';
    form.action = cfg.handlerUrl || '';
    submitBtn.textContent = cfg.submitLabel || 'Confirm';
    submitBtn.className = 'admin-btn ' + (cfg.submitClass || 'admin-btn--danger');
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  modal.querySelectorAll('.js-admin-content-confirm-cancel, .js-admin-content-confirm-backdrop').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  document.addEventListener('click', function (e) {
    var suspendBtn = e.target.closest('.js-admin-content-suspend');
    if (suspendBtn) {
      e.preventDefault();
      var t = suspendBtn.getAttribute('data-entity-type') || 'listing';
      var kind = typeLabels[t] || 'item';
      var name = suspendBtn.getAttribute('data-entity-label') || 'this ' + kind;
      openModal({
        title: 'Suspend ' + kind + '?',
        message:
          'You are about to suspend “' +
          name +
          '”. It will be hidden from the app and sent back for review before it can go live again.',
        action: 'suspend',
        handlerUrl: suspendBtn.getAttribute('data-handler-url'),
        returnTo: suspendBtn.getAttribute('data-return') || '',
        submitLabel: 'Suspend',
        submitClass: 'admin-btn--warning',
        entityType: t,
      });
      return;
    }

    var deleteBtn = e.target.closest('.js-admin-content-delete');
    if (deleteBtn) {
      e.preventDefault();
      var dt = deleteBtn.getAttribute('data-entity-type') || 'listing';
      var dkind = typeLabels[dt] || 'item';
      var dname = deleteBtn.getAttribute('data-entity-label') || 'this ' + dkind;
      openModal({
        title: 'Delete ' + dkind + ' permanently?',
        message:
          'You are about to permanently delete “' +
          dname +
          '”. Related data may also be removed. This cannot be undone.',
        action: 'delete',
        handlerUrl: deleteBtn.getAttribute('data-handler-url'),
        returnTo: deleteBtn.getAttribute('data-return') || '',
        submitLabel: 'Delete permanently',
        submitClass: 'admin-btn--danger',
        entityType: dt,
      });
    }
  });
})();

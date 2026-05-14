<?php

declare(strict_types=1);

$_ww_category_delete_warning = isset($ww_category_delete_modal_warning) && is_string($ww_category_delete_modal_warning)
    ? $ww_category_delete_modal_warning
    : 'Delete this category? This cannot be undone.';
?>
<form id="delete-cat-form" method="post" class="hidden">
  <input type="hidden" name="action" value="delete" />
  <input type="hidden" name="cat_id" id="delete-cat-id" />
</form>

<div id="ww-delete-cat-modal" class="fixed inset-0 z-[100] hidden" aria-hidden="true" role="dialog" aria-labelledby="ww-delete-cat-title">
  <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" data-ww-delete-cat-dismiss></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h3 id="ww-delete-cat-title" class="text-lg font-semibold text-slate-900">Delete category?</h3>
      <p class="mt-2 text-sm text-slate-700">You are about to delete <span id="ww-delete-cat-name" class="font-semibold text-slate-900"></span>.</p>
      <p class="mt-2 text-sm text-slate-500"><?= htmlspecialchars($_ww_category_delete_warning, ENT_QUOTES, 'UTF-8') ?></p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-ww-delete-cat-dismiss>Cancel</button>
        <button type="button" id="ww-delete-cat-confirm" class="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete</button>
      </div>
    </div>
  </div>
</div>
<script>
(function () {
  'use strict';
  var modal = document.getElementById('ww-delete-cat-modal');
  var nameEl = document.getElementById('ww-delete-cat-name');
  var confirmBtn = document.getElementById('ww-delete-cat-confirm');
  var form = document.getElementById('delete-cat-form');
  var idField = document.getElementById('delete-cat-id');
  var pendingId = null;

  function close() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    pendingId = null;
  }

  function submitDelete() {
    if (!form || !idField || pendingId == null) return;
    idField.value = String(pendingId);
    form.submit();
  }

  function open(id, name) {
    if (!modal || !nameEl) return;
    pendingId = id;
    nameEl.textContent = name;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      if (confirmBtn) confirmBtn.focus();
    }, 30);
  }

  window.confirmDeleteCategory = function (id, name) {
    open(id, name);
  };

  if (modal) {
    modal.querySelectorAll('[data-ww-delete-cat-dismiss]').forEach(function (el) {
      el.addEventListener('click', close);
    });
  }
  if (confirmBtn) {
    confirmBtn.addEventListener('click', submitDelete);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      close();
    }
  });
})();
</script>

<?php
declare(strict_types=1);
?>
<div id="ww-rename-cat-modal" class="fixed inset-0 z-[100] hidden" aria-hidden="true" role="dialog" aria-labelledby="ww-rename-cat-title">
  <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" data-ww-rename-cat-dismiss></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-panel">
      <h3 id="ww-rename-cat-title" class="text-lg font-semibold text-slate-900">Rename category</h3>
      <p class="mt-1 text-sm text-slate-500" id="ww-rename-cat-desc"></p>
      <label class="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-600" for="ww-rename-cat-input">New name</label>
      <input type="text" id="ww-rename-cat-input" maxlength="120" autocomplete="off" class="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20" />
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" data-ww-rename-cat-dismiss>Cancel</button>
        <button type="button" id="ww-rename-cat-save" class="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-95">Save</button>
      </div>
    </div>
  </div>
</div>
<script>
(function () {
  'use strict';
  var modal = document.getElementById('ww-rename-cat-modal');
  var input = document.getElementById('ww-rename-cat-input');
  var desc = document.getElementById('ww-rename-cat-desc');
  var saveBtn = document.getElementById('ww-rename-cat-save');
  var form = document.getElementById('rename-form');
  var idField = document.getElementById('rename-cat-id');
  var nameField = document.getElementById('rename-name');
  var currentId = null;
  var originalName = '';

  function close() {
    if (!modal) return;
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    currentId = null;
    originalName = '';
  }

  function submitRename() {
    if (!form || !idField || !nameField || !currentId) return;
    var v = (input && input.value ? input.value : '').trim();
    if (!v) return;
    if (v === originalName) {
      close();
      return;
    }
    idField.value = String(currentId);
    nameField.value = v;
    form.submit();
  }

  function open(id, current) {
    if (!modal || !input || !desc) return;
    currentId = id;
    originalName = current;
    desc.textContent = 'Renaming "' + current + '".';
    input.value = current;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    setTimeout(function () {
      input.focus();
      input.select();
    }, 30);
  }

  window.renameCategory = function (id, current) {
    open(id, current);
  };

  if (modal) {
    modal.querySelectorAll('[data-ww-rename-cat-dismiss]').forEach(function (el) {
      el.addEventListener('click', close);
    });
  }
  if (saveBtn) {
    saveBtn.addEventListener('click', submitRename);
  }
  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitRename();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      close();
    }
  });
})();
</script>

<div id="admin-user-confirm-modal" class="fixed inset-0 z-[60] hidden" role="dialog" aria-modal="true" aria-labelledby="admin-user-confirm-title">
  <div class="absolute inset-0 bg-slate-900/65 backdrop-blur-[2px] js-admin-user-confirm-backdrop" aria-hidden="true"></div>
  <div class="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
    <div class="pointer-events-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/25">
      <h2 id="admin-user-confirm-title" class="text-lg font-bold text-slate-900">Confirm action</h2>
      <p id="admin-user-confirm-message" class="mt-3 text-sm leading-relaxed text-slate-600"></p>
      <form id="admin-user-confirm-form" method="post" action="" class="mt-6 flex flex-wrap gap-3 justify-end">
        <input type="hidden" name="action" id="admin-user-confirm-action" value="" />
        <input type="hidden" name="return" id="admin-user-confirm-return" value="" />
        <button type="button" class="admin-btn admin-btn--ghost js-admin-user-confirm-cancel">Cancel</button>
        <button type="submit" id="admin-user-confirm-submit" class="admin-btn admin-btn--danger">Confirm</button>
      </form>
    </div>
  </div>
</div>

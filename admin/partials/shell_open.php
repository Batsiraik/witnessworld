<div class="pl-64">
  <header class="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-6 backdrop-blur-md">
    <div>
      <h1 class="text-lg font-semibold text-slate-900"><?= htmlspecialchars($pageTitle ?? 'Dashboard', ENT_QUOTES, 'UTF-8') ?></h1>
      <p class="text-xs text-slate-500">Witness World Connect · control panel</p>
    </div>
    <div class="flex items-center gap-3">
      <span class="hidden rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">Local dev</span>
      <button type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-brand/40 hover:text-brand">
        Notifications
      </button>
    </div>
  </header>
  <main class="p-6">

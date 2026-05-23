<div class="lg:pl-64">
  <header class="admin-shell-header sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
    <button
      type="button"
      id="admin-menu-toggle"
      class="lg:hidden flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-brand/40 hover:text-brand"
      aria-label="Open menu"
      aria-expanded="false"
      aria-controls="admin-sidebar"
    >
      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
    <div class="min-w-0 flex-1">
      <h1 class="truncate text-lg font-semibold text-slate-900"><?= htmlspecialchars($pageTitle ?? 'Dashboard', ENT_QUOTES, 'UTF-8') ?></h1>
      <p class="admin-header-sub truncate text-xs text-slate-500">Witness World Connect · control panel</p>
    </div>
    <div class="flex shrink-0 items-center gap-2 sm:gap-3">
      <span class="hidden rounded-full bg-sand/60 px-3 py-1 text-xs font-medium text-slate-600 sm:inline">Staging dev</span>
      <button type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand/40 hover:text-brand sm:px-3 sm:text-sm">
        <span class="hidden sm:inline">Notifications</span>
        <span class="sm:hidden" aria-hidden="true">🔔</span>
      </button>
    </div>
  </header>
  <main class="admin-main p-4 sm:p-6">

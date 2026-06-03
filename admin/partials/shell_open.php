<?php
$shellBase = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
if ($shellBase === '' || $shellBase === '.') {
    $shellBase = '';
}
$shellAdminBase = $shellBase === '' ? '' : $shellBase . '/';
$shellNotifApi = ($shellBase === '' ? '' : $shellBase . '/') . 'admin_notifications_api.php';
?>
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
      <div
        id="admin-notif-root"
        class="relative"
        data-api-url="<?= htmlspecialchars($shellNotifApi, ENT_QUOTES, 'UTF-8') ?>"
        data-admin-base="<?= htmlspecialchars($shellAdminBase, ENT_QUOTES, 'UTF-8') ?>"
      >
        <button
          type="button"
          id="admin-notif-btn"
          class="relative rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-brand/40 hover:text-brand sm:px-3 sm:text-sm"
          aria-label="Notifications"
          aria-expanded="false"
          aria-haspopup="true"
        >
          <span class="inline-flex items-center gap-1.5">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <span class="hidden sm:inline">Notifications</span>
          </span>
          <span
            id="admin-notif-badge"
            class="hidden absolute -right-1 -top-1 min-w-[1.125rem] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-4 text-white"
          >0</span>
        </button>
        <div
          id="admin-notif-panel"
          class="hidden absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-panel"
          role="menu"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p class="text-sm font-semibold text-slate-900">Notifications</p>
            <button type="button" id="admin-notif-mark-all" class="text-xs font-semibold text-brand hover:underline">Mark all read</button>
          </div>
          <div id="admin-notif-empty" class="hidden px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
          <div id="admin-notif-list" class="max-h-80 overflow-y-auto"></div>
        </div>
      </div>
    </div>
  </header>
  <main class="admin-main p-4 sm:p-6">

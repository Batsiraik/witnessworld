<?php
/** @var string $activeNav */
$activeNav = $activeNav ?? '';
/** @var array{id:int,username:string,name:string,email:string,is_super:bool}|null $currentAdmin */
$cu = $currentAdmin ?? [];
$navClass = static function (string $key) use ($activeNav): string {
    $base = 'flex items-center gap-3 rounded-r-lg border-l-[3px] px-3 py-2.5 text-sm font-medium transition hover:bg-white/5 hover:text-white ';
    return $base . ($activeNav === $key
        ? 'border-brand bg-brand/15 text-white'
        : 'border-transparent text-slate-300');
};
$base = rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? ''), '/\\');
if ($base === '' || $base === '.') {
    $base = '';
}
$home = $base === '' ? 'index.php' : $base . '/index.php';
$users = $base === '' ? 'users.php' : $base . '/users.php';
$questionnaire = $base === '' ? 'questionnaire.php' : $base . '/questionnaire.php';
$settings = $base === '' ? 'settings.php' : $base . '/settings.php';
$listings = $base === '' ? 'listings.php' : $base . '/listings.php';
$stores = $base === '' ? 'stores.php' : $base . '/stores.php';
$storeProducts = $base === '' ? 'store_products.php' : $base . '/store_products.php';
$directoryAdmin = $base === '' ? 'directory.php' : $base . '/directory.php';
$moderation = $base === '' ? 'moderation.php' : $base . '/moderation.php';
$analytics = $base === '' ? 'analytics.php' : $base . '/analytics.php';
$admins = $base === '' ? 'admins.php' : $base . '/admins.php';
$pushNotifications = $base === '' ? 'push_notifications.php' : $base . '/push_notifications.php';
$logout = $base === '' ? 'logout.php' : $base . '/logout.php';
$isSuper = !empty($cu['is_super']);
?>
<aside class="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/10 bg-[#0f2847] text-slate-200 shadow-lg">
  <div class="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
    <img src="assets/logo.jpg" alt="Witness World Connect" class="h-10 w-10 rounded-lg object-cover ring-1 ring-white/10" width="40" height="40" />
    <div class="min-w-0">
      <p class="truncate text-sm font-semibold text-white">Witness World</p>
      <p class="truncate text-xs text-slate-400">Admin</p>
    </div>
  </div>
  <nav class="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Main">
    <p class="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Menu</p>
    <a href="<?= htmlspecialchars($home, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('dashboard'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
      </span>
      Dashboard
    </a>
    <a href="<?= htmlspecialchars($users, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('users'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
      </span>
      App users
    </a>
    <a href="<?= htmlspecialchars($listings, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('listings'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
      </span>
      Listings & gigs
    </a>
    <a href="<?= htmlspecialchars($stores, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('stores'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
      </span>
      Online stores
    </a>
    <a href="<?= htmlspecialchars($storeProducts, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('store_products'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
      </span>
      Store products
    </a>
    <a href="<?= htmlspecialchars($directoryAdmin, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('directory'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
      </span>
      Business directory
    </a>
    <a href="<?= htmlspecialchars($moderation, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('moderation'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
      </span>
      Content reports
    </a>
    <a href="<?= htmlspecialchars($analytics, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('analytics'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
      </span>
      Analytics
    </a>
    <a href="<?= htmlspecialchars($pushNotifications, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('push'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
      </span>
      Push notification
    </a>
    <a href="<?= htmlspecialchars($questionnaire, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('questionnaire'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      </span>
      Questionnaire
    </a>
    <a href="<?= htmlspecialchars($settings, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('settings'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
      </span>
      Settings
    </a>
    <?php if ($isSuper): ?>
    <a href="<?= htmlspecialchars($admins, ENT_QUOTES, 'UTF-8') ?>"
       class="<?= htmlspecialchars($navClass('admins'), ENT_QUOTES, 'UTF-8') ?>">
      <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-brand" aria-hidden="true">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197"/></svg>
      </span>
      Admins
    </a>
    <?php endif; ?>
  </nav>
  <div class="border-t border-white/10 p-4 space-y-2">
    <div class="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
      <p class="text-xs font-medium text-slate-400">Signed in</p>
      <p class="truncate text-sm font-semibold text-white"><?= htmlspecialchars((string) ($cu['name'] ?? ''), ENT_QUOTES, 'UTF-8') ?></p>
    </div>
    <a href="<?= htmlspecialchars($logout, ENT_QUOTES, 'UTF-8') ?>" class="block w-full rounded-xl border border-white/10 bg-white/5 py-2 text-center text-sm font-semibold text-white hover:bg-white/10">Log out</a>
  </div>
</aside>

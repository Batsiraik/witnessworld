(function (global) {
  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function qs(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  function qsInt(name) {
    const v = parseInt(qs(name) || '', 10);
    return Number.isFinite(v) && v > 0 ? v : 0;
  }

  function formatListingLoc(row) {
    const parts = [row.location_us_state, row.location_country_name].filter(Boolean);
    return parts.join(', ') || 'Location not set';
  }

  function formatDirLoc(row) {
    const parts = [row.city, row.location_us_state].filter(Boolean);
    return parts.join(', ') || formatListingLoc(row);
  }

  function formatTime(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(iso);
    }
  }

  function formatRelative(iso) {
    if (!iso) return '';
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return '';
    const days = Math.floor((Date.now() - t) / 86400000);
    if (days < 1) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months} mo ago`;
    return `${Math.floor(days / 365)} yr ago`;
  }

  function showLoading(el) {
    el.innerHTML = '<div class="wwc-loading"><div class="wwc-spinner" role="status" aria-label="Loading"></div></div>';
  }

  function showError(el, msg, retryFn) {
    el.innerHTML = `
      <p class="wwc-feed-error">${escapeHtml(msg)}</p>
      ${retryFn ? '<button type="button" class="wwc-feed-retry" id="wwc-retry-btn">Try again</button>' : ''}`;
    if (retryFn) document.getElementById('wwc-retry-btn')?.addEventListener('click', retryFn);
  }

  global.WWC_UTIL = {
    escapeHtml,
    escapeAttr,
    qs,
    qsInt,
    formatListingLoc,
    formatDirLoc,
    formatTime,
    formatRelative,
    showLoading,
    showError,
  };
})(window);

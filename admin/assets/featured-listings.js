(function () {
  var cfg = window.WW_FEATURED_LISTINGS || {};
  var apiUrl = cfg.apiUrl || 'featured_listings_api.php';

  var modal = document.getElementById('fl-add-modal');
  var openBtn = document.getElementById('fl-open-add');
  var searchInput = document.getElementById('fl-search');
  var resultsEl = document.getElementById('fl-search-results');
  var tbody = document.getElementById('fl-featured-tbody');

  var debounceTimer = null;

  function esc(s) {
    if (s == null) return '';
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function showEmptyState() {
    if (!tbody || tbody.querySelector('tr[data-featured-id]')) return;
    if (document.getElementById('fl-empty-row')) return;
    var tr = document.createElement('tr');
    tr.id = 'fl-empty-row';
    tr.innerHTML =
      '<td colspan="6" class="px-6 py-10 text-center text-slate-500">No featured listings yet. Click <strong>Add to featured</strong> to pick listings.</td>';
    tbody.appendChild(tr);
  }

  function removeFeaturedRow(id) {
    var row = document.querySelector('tr[data-featured-id="' + id + '"]');
    if (row) row.remove();
    showEmptyState();
  }

  /* —— Remove from featured (works without modal) —— */
  document.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('.js-fl-remove');
    if (!removeBtn || removeBtn.tagName !== 'BUTTON') return;
    var form = removeBtn.closest('form.js-fl-remove-form');
    if (!form) return;

    e.preventDefault();
    var id = removeBtn.getAttribute('data-id');
    var title = removeBtn.getAttribute('data-title') || 'this listing';
    if (!id || !confirm('Remove “' + title + '” from featured?')) return;

    removeBtn.disabled = true;
    removeBtn.textContent = 'Removing…';

    var body = new FormData();
    body.append('action', 'remove');
    body.append('id', id);

    fetch(apiUrl, { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok) {
          removeFeaturedRow(id);
          removeBtn.textContent = 'Removed';
        } else {
          removeBtn.disabled = false;
          removeBtn.textContent = 'Remove from featured';
          alert(data.error || 'Could not remove from featured.');
        }
      })
      .catch(function () {
        form.submit();
      });
  });

  /* —— Add modal (optional) —— */
  if (!modal || !openBtn || !searchInput || !resultsEl) return;

  function openModal() {
    modal.classList.remove('hidden');
    document.documentElement.classList.add('overflow-hidden');
    searchInput.value = '';
    resultsEl.innerHTML = '<p class="px-4 py-8 text-center text-sm text-slate-500">Loading listings…</p>';
    searchInput.focus();
    loadSearch('');
  }

  function closeModal() {
    modal.classList.add('hidden');
    document.documentElement.classList.remove('overflow-hidden');
  }

  modal.querySelectorAll('.js-fl-modal-close, .js-fl-modal-backdrop').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
  });

  openBtn.addEventListener('click', openModal);

  function loadSearch(q) {
    var url = apiUrl + '?available=1&limit=40&q=' + encodeURIComponent(q);
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok || !data.items) {
          resultsEl.innerHTML = '<p class="px-4 py-8 text-center text-sm text-red-600">Could not load listings.</p>';
          return;
        }
        if (data.items.length === 0) {
          resultsEl.innerHTML =
            '<p class="px-4 py-8 text-center text-sm text-slate-500">No listings match. Try another search.</p>';
          return;
        }
        var html = '<ul class="divide-y divide-slate-100">';
        data.items.forEach(function (item) {
          var statusCls =
            item.moderation_status === 'approved'
              ? 'text-emerald-700 bg-emerald-50'
              : 'text-amber-800 bg-amber-50';
          html +=
            '<li class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-xl mx-1">' +
            '<div class="min-w-0 flex-1">' +
            '<p class="font-semibold text-slate-900 truncate">' +
            esc(item.title) +
            '</p>' +
            '<p class="text-xs text-slate-500 mt-0.5">#' +
            item.id +
            ' · ' +
            esc(item.listing_type) +
            ' · ' +
            esc(item.seller_label) +
            ' <span class="text-slate-400">@' +
            esc(item.username) +
            '</span></p>' +
            '</div>' +
            '<span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ' +
            statusCls +
            '">' +
            esc(item.moderation_status) +
            '</span>' +
            '<button type="button" class="admin-btn admin-btn--warning admin-btn--sm shrink-0 js-fl-add-one" data-id="' +
            item.id +
            '">Add</button>' +
            '</li>';
        });
        html += '</ul>';
        resultsEl.innerHTML = html;
      })
      .catch(function () {
        resultsEl.innerHTML = '<p class="px-4 py-8 text-center text-sm text-red-600">Network error.</p>';
      });
  }

  searchInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    var q = searchInput.value.trim();
    debounceTimer = setTimeout(function () {
      loadSearch(q);
    }, 280);
  });

  resultsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.js-fl-add-one');
    if (!btn) return;
    var id = btn.getAttribute('data-id');
    if (!id) return;
    btn.disabled = true;
    btn.textContent = 'Adding…';
    var body = new FormData();
    body.append('action', 'add');
    body.append('id', id);
    fetch(apiUrl, { method: 'POST', body: body, credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data.ok) {
          window.location.href = 'featured_listings.php?added=1';
        } else {
          btn.disabled = false;
          btn.textContent = 'Add';
          alert(data.error || 'Could not add listing.');
        }
      })
      .catch(function () {
        btn.disabled = false;
        btn.textContent = 'Add';
        alert('Network error.');
      });
  });
})();

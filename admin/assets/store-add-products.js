(function () {
  var cfg = window.WW_STORE_PRODUCTS || {};
  var lookupApi = cfg.lookupApi || 'admin_lookup_api.php';
  var uploadApi = cfg.uploadApi || 'admin_media_upload.php';
  var storeId = cfg.storeId || 0;
  var storeUserId = cfg.storeUserId || 0;
  var gallery = [];
  var MAX = 8;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function syncHidden() {
    $('sp-image-url').value = gallery[0] || '';
    $('sp-gallery-json').value = JSON.stringify(gallery);
    renderGallery();
  }

  function renderGallery() {
    var el = $('sp-gallery-preview');
    if (!el) return;
    if (!gallery.length) {
      el.innerHTML = '';
      $('sp-image-label').textContent = 'Upload one or more photos. You can remove extras before saving.';
      return;
    }
    el.innerHTML = gallery
      .map(function (url, i) {
        return (
          '<div class="relative" data-idx="' +
          i +
          '">' +
          '<img src="' +
          esc(url) +
          '" alt="" class="h-20 w-20 rounded-xl object-cover ring-1 ring-slate-200" />' +
          (i === 0
            ? '<span class="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>'
            : '') +
          '<button type="button" class="sp-remove-img absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-xs font-bold text-white" data-idx="' +
          i +
          '" title="Remove">×</button>' +
          '</div>'
        );
      })
      .join('');
    $('sp-image-label').textContent = gallery.length + ' photo' + (gallery.length === 1 ? '' : 's') + ' ready (max ' + MAX + '). First image is the cover.';
  }

  function loadStores(q) {
    fetch(lookupApi + '?action=stores&q=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var el = $('sp-store-results');
        if (!data.ok || !data.items.length) {
          el.innerHTML = '<p class="p-4 text-center text-sm text-slate-500">No stores found.</p>';
          return;
        }
        el.innerHTML = data.items
          .map(function (s) {
            return (
              '<button type="button" class="sp-pick-store block w-full text-left rounded-xl px-4 py-3 hover:bg-slate-50 border-b" data-id="' +
              s.id +
              '" data-user="' +
              s.user_id +
              '" data-name="' +
              esc(s.name) +
              '">' +
              '<span class="font-semibold">' +
              esc(s.name) +
              '</span>' +
              '<span class="block text-xs text-slate-500">#' +
              s.id +
              ' · ' +
              esc(s.owner) +
              ' · ' +
              esc(s.moderation_status) +
              '</span></button>'
            );
          })
          .join('');
      });
  }

  function pickStore(id, userId, name) {
    storeId = id;
    storeUserId = userId;
    gallery = [];
    syncHidden();
    $('sp-store-id').value = String(id);
    $('sp-store-selected').innerHTML =
      '<strong>' +
      esc(name) +
      '</strong> <span class="text-slate-500">(#' +
      id +
      ')</span> <button type="button" id="sp-store-change" class="ml-2 text-brand font-semibold hover:underline">Change</button>';
    $('sp-store-selected').classList.remove('hidden');
    $('sp-open-store').classList.add('hidden');
    $('sp-product-panel').classList.remove('hidden');
    $('sp-store-modal').classList.add('hidden');
    document.getElementById('sp-store-change').addEventListener('click', openStoreModal);
  }

  function openStoreModal() {
    $('sp-store-modal').classList.remove('hidden');
    loadStores('');
  }

  function uploadFile(file) {
    var fd = new FormData();
    fd.append('file', file);
    fd.append('user_id', String(storeUserId || 1));
    fd.append('store_id', String(storeId));
    fd.append('kind', 'product');
    return fetch(uploadApi, { method: 'POST', body: fd, credentials: 'same-origin' }).then(function (r) {
      return r.json();
    });
  }

  $('sp-open-store').addEventListener('click', openStoreModal);
  document.querySelectorAll('.js-sp-store-close').forEach(function (el) {
    el.addEventListener('click', function () {
      $('sp-store-modal').classList.add('hidden');
    });
  });
  if ($('sp-store-change')) {
    $('sp-store-change').addEventListener('click', openStoreModal);
  }

  var t;
  $('sp-store-search').addEventListener('input', function () {
    clearTimeout(t);
    t = setTimeout(function () {
      loadStores($('sp-store-search').value.trim());
    }, 250);
  });

  $('sp-store-results').addEventListener('click', function (e) {
    var btn = e.target.closest('.sp-pick-store');
    if (!btn) return;
    pickStore(parseInt(btn.getAttribute('data-id'), 10), parseInt(btn.getAttribute('data-user'), 10), btn.getAttribute('data-name'));
  });

  $('sp-gallery-preview').addEventListener('click', function (e) {
    var btn = e.target.closest('.sp-remove-img');
    if (!btn) return;
    var idx = parseInt(btn.getAttribute('data-idx'), 10);
    if (Number.isNaN(idx)) return;
    gallery.splice(idx, 1);
    syncHidden();
  });

  $('sp-photo-file').addEventListener('change', async function () {
    if (!this.files || !this.files.length || !storeId) {
      alert('Select a store first');
      return;
    }
    var files = Array.prototype.slice.call(this.files);
    this.disabled = true;
    $('sp-image-label').textContent = 'Uploading…';
    try {
      for (var i = 0; i < files.length; i++) {
        if (gallery.length >= MAX) break;
        var data = await uploadFile(files[i]);
        if (data.ok && data.url) {
          gallery.push(data.url);
        } else {
          alert(data.error || 'Upload failed');
          break;
        }
      }
      syncHidden();
    } catch (err) {
      alert('Upload failed');
    } finally {
      this.disabled = false;
      this.value = '';
    }
  });

  $('sp-product-form').addEventListener('submit', function (e) {
    syncHidden();
    if (!$('sp-image-url').value) {
      e.preventDefault();
      alert('Upload at least one product photo first.');
    }
  });

  syncHidden();
})();

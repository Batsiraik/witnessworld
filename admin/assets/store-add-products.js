(function () {
  var cfg = window.WW_STORE_PRODUCTS || {};
  var lookupApi = cfg.lookupApi || 'admin_lookup_api.php';
  var uploadApi = cfg.uploadApi || 'admin_media_upload.php';
  var storeId = cfg.storeId || 0;
  var storeUserId = cfg.storeUserId || 0;

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
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

  $('sp-photo-file').addEventListener('change', function () {
    if (!this.files || !this.files[0] || !storeId) {
      alert('Select a store first');
      return;
    }
    var fd = new FormData();
    fd.append('file', this.files[0]);
    fd.append('user_id', String(storeUserId || 1));
    fd.append('store_id', String(storeId));
    fd.append('kind', 'product');
    this.disabled = true;
    fetch(uploadApi, { method: 'POST', body: fd, credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(
        function (data) {
          this.disabled = false;
          if (data.ok) {
            $('sp-image-url').value = data.url;
            $('sp-image-label').textContent = 'Uploaded: ' + data.url;
          } else {
            alert(data.error || 'Upload failed');
          }
        }.bind(this)
      );
  });

  $('sp-product-form').addEventListener('submit', function (e) {
    if (!$('sp-image-url').value) {
      e.preventDefault();
      alert('Upload a product photo first.');
    }
  });
})();

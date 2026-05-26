(function () {
  var cfg = window.WW_ADMIN_CREATE || {};
  var lookupApi = cfg.lookupApi || 'admin_lookup_api.php';
  var uploadApi = cfg.uploadApi || 'admin_media_upload.php';

  var state = { userId: 0, userLabel: '', contentType: '', step: 1 };
  var formDataCache = {};

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    var d = document.createElement('div');
    d.textContent = String(s);
    return d.innerHTML;
  }

  function setStep(n) {
    state.step = n;
    document.querySelectorAll('.ac-panel').forEach(function (p) {
      p.classList.add('hidden');
    });
    var panel = $('ac-panel-' + n);
    if (panel) panel.classList.remove('hidden');
    document.querySelectorAll('.ac-step-pill').forEach(function (pill) {
      var s = parseInt(pill.getAttribute('data-step'), 10);
      if (s === n) {
        pill.className = 'ac-step-pill rounded-full bg-brand/15 px-3 py-1 text-brand';
      } else if (s < n) {
        pill.className = 'ac-step-pill rounded-full bg-emerald-50 px-3 py-1 text-emerald-700';
      } else {
        pill.className = 'ac-step-pill rounded-full bg-slate-100 px-3 py-1 text-slate-500';
      }
    });
  }

  function selectUser(id, label) {
    state.userId = id;
    state.userLabel = label;
    $('ac-field-user-id').value = String(id);
    $('ac-user-label').textContent = label;
    $('ac-user-selected').classList.remove('hidden');
    $('ac-open-user').classList.add('hidden');
    closeUserModal();
    setStep(2);
  }

  function openUserModal() {
    $('ac-user-modal').classList.remove('hidden');
    $('ac-user-search').focus();
    loadUsers('');
  }

  function closeUserModal() {
    $('ac-user-modal').classList.add('hidden');
  }

  function loadUsers(q) {
    fetch(lookupApi + '?action=users&q=' + encodeURIComponent(q), { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var el = $('ac-user-results');
        if (!data.ok || !data.items.length) {
          el.innerHTML = '<p class="p-4 text-sm text-slate-500 text-center">No members found.</p>';
          return;
        }
        el.innerHTML = data.items
          .map(function (u) {
            return (
              '<button type="button" class="ac-pick-user w-full text-left rounded-xl px-4 py-3 hover:bg-slate-50 border-b border-slate-100" data-id="' +
              u.id +
              '" data-label="' +
              esc(u.label + ' (@' + u.username + ') · ' + u.email) +
              '">' +
              '<span class="font-semibold text-slate-900">' +
              esc(u.label) +
              '</span>' +
              '<span class="block text-xs text-slate-500">@' +
              esc(u.username) +
              ' · ' +
              esc(u.email) +
              ' · ' +
              esc(u.status) +
              '</span></button>'
            );
          })
          .join('');
      });
  }

  var userSearchTimer;
  $('ac-user-search').addEventListener('input', function () {
    clearTimeout(userSearchTimer);
    userSearchTimer = setTimeout(function () {
      loadUsers($('ac-user-search').value.trim());
    }, 250);
  });

  $('ac-user-results').addEventListener('click', function (e) {
    var btn = e.target.closest('.ac-pick-user');
    if (!btn) return;
    selectUser(parseInt(btn.getAttribute('data-id'), 10), btn.getAttribute('data-label'));
  });

  $('ac-open-user').addEventListener('click', openUserModal);
  $('ac-user-change').addEventListener('click', function () {
    $('ac-user-selected').classList.add('hidden');
    $('ac-open-user').classList.remove('hidden');
    openUserModal();
  });
  document.querySelectorAll('.js-ac-user-close').forEach(function (el) {
    el.addEventListener('click', closeUserModal);
  });

  function loadCategories(type) {
    var catType = type;
    if (type === 'classified' || type === 'service' || type === 'community') {
      fetch(lookupApi + '?action=categories&type=' + encodeURIComponent(type), { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var sel = $('ac-listing-category');
          if (!sel || !data.ok) return;
          sel.innerHTML = '<option value="">— Optional —</option>';
          data.items.forEach(function (c) {
            sel.innerHTML += '<option value="' + c.id + '">' + esc(c.name) + '</option>';
          });
        });
    }
    if (type === 'store') {
      fetch(lookupApi + '?action=categories&type=store', { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var sel = $('ac-store-category');
          if (!sel || !data.ok) return;
          sel.innerHTML = '<option value="">— Optional —</option>';
          data.items.forEach(function (c) {
            sel.innerHTML += '<option value="' + c.id + '">' + esc(c.name) + '</option>';
          });
        });
    }
    if (type === 'directory') {
      fetch(lookupApi + '?action=categories&type=directory', { credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          var sel = $('ac-directory-category');
          if (!sel || !data.ok) return;
          sel.innerHTML = '<option value="">Select…</option>';
          data.items.forEach(function (c) {
            sel.innerHTML += '<option value="' + c.id + '">' + esc(c.name) + '</option>';
          });
        });
    }
  }

  function loadLocations() {
    if (window._acLocationsLoaded) return;
    fetch(lookupApi + '?action=locations', { credentials: 'same-origin' })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (!data.ok) return;
        window._acLocationsLoaded = true;
        var csel = $('ac-country');
        var ssel = $('ac-state');
        data.countries.forEach(function (c) {
          csel.innerHTML += '<option value="' + esc(c.code) + '">' + esc(c.name) + '</option>';
        });
        data.us_states.forEach(function (s) {
          ssel.innerHTML += '<option value="' + esc(s.code) + '">' + esc(s.name) + '</option>';
        });
      });
  }

  $('ac-country').addEventListener('change', function () {
    var wrap = $('ac-state-wrap');
    if (this.value === 'US') wrap.classList.remove('hidden');
    else wrap.classList.add('hidden');
  });

  function setFieldsEnabled() {
    document.querySelectorAll('#ac-form input, #ac-form textarea, #ac-form select').forEach(function (el) {
      var block = el.closest('.ac-fields');
      el.disabled = block ? block.classList.contains('hidden') : false;
    });
  }

  function showFormForType(type) {
    state.contentType = type;
    $('ac-field-content-type').value = type;
    document.querySelectorAll('.ac-fields').forEach(function (f) {
      f.classList.add('hidden');
    });
    document.querySelector('.ac-fields-location').classList.remove('hidden');
    loadLocations();

    if (type === 'classified' || type === 'service' || type === 'community') {
      document.querySelector('.ac-fields-listing').classList.remove('hidden');
      document.querySelector('.ac-classified-only').classList.toggle('hidden', type !== 'classified');
      document.querySelector('.ac-service-only').classList.toggle('hidden', type !== 'service');
      $('ac-form-title').textContent =
        type === 'classified' ? 'Marketplace listing' : type === 'service' ? 'Service listing' : 'Community classified';
      loadCategories(type);
    } else if (type === 'store') {
      document.querySelector('.ac-fields-store').classList.remove('hidden');
      $('ac-form-title').textContent = 'Online store';
      loadCategories('store');
    } else if (type === 'directory') {
      document.querySelector('.ac-fields-directory').classList.remove('hidden');
      $('ac-form-title').textContent = 'Business directory';
      loadCategories('directory');
    }
    setFieldsEnabled();
    setStep(3);
  }

  document.querySelectorAll('.ac-type-card').forEach(function (card) {
    card.addEventListener('click', function () {
      if (!state.userId) {
        alert('Choose a member first.');
        setStep(1);
        return;
      }
      showFormForType(card.getAttribute('data-type'));
    });
  });

  document.querySelectorAll('.ac-back').forEach(function (btn) {
    btn.addEventListener('click', function () {
      setStep(parseInt(btn.getAttribute('data-to'), 10));
    });
  });

  document.querySelectorAll('.ac-upload').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!this.files || !this.files[0] || !state.userId) return;
      var fd = new FormData();
      fd.append('file', this.files[0]);
      fd.append('user_id', String(state.userId));
      fd.append('kind', this.getAttribute('data-kind') || 'listing');
      if (this.getAttribute('data-video') === '1') fd.append('allow_video', '1');
      var target = this.getAttribute('data-target');
      var hidden = document.querySelector('[name="' + target + '"]') || $(('ac-' + target).replace(/_/g, '-'));
      if (target === 'media_url') hidden = $('ac-media-url');
      if (target === 'video_url') hidden = $('ac-video-url');
      if (target === 'logo_url' && this.getAttribute('data-kind') === 'directory') hidden = $('ac-dir-logo-url');
      else if (target === 'logo_url') hidden = $('ac-logo-url');
      if (target === 'banner_url') hidden = $('ac-banner-url');
      this.disabled = true;
      fetch(uploadApi, { method: 'POST', body: fd, credentials: 'same-origin' })
        .then(function (r) {
          return r.json();
        })
        .then(
          function (data) {
            this.disabled = false;
            if (data.ok && data.url) {
              if (hidden) hidden.value = data.url;
              var lbl = document.getElementById('ac-' + target.replace(/_/g, '-') + '-label');
              if (lbl) lbl.textContent = 'Uploaded: ' + data.url;
              else if (target === 'media_url') $('ac-media-url-label').textContent = 'Uploaded: ' + data.url;
              if (target === 'logo_url' && this.getAttribute('data-kind') === 'store')
                $('ac-logo-url-label').textContent = 'Uploaded: ' + data.url;
              if (target === 'logo_url' && this.getAttribute('data-kind') === 'directory') {
                $('ac-dir-logo-url-label').textContent = 'Uploaded ✓';
                var prev = $('ac-dir-logo-preview');
                var img = $('ac-dir-logo-img');
                if (prev && img) { img.src = data.url; prev.classList.remove('hidden'); }
              }
            } else {
              alert(data.error || 'Upload failed');
            }
          }.bind(this)
        )
        .catch(
          function () {
            this.disabled = false;
            alert('Upload failed');
          }.bind(this)
        );
    });
  });

  var portfolioUrls = [];
  var portfolioThumbsEl = $('ac-portfolio-thumbs');
  var portfolioHiddenEl = $('ac-portfolio-hidden');

  function renderPortfolio() {
    if (!portfolioThumbsEl) return;
    portfolioThumbsEl.innerHTML = '';
    portfolioHiddenEl.innerHTML = '';
    portfolioUrls.forEach(function (url, i) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:72px;height:72px;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;';
      var img = document.createElement('img');
      img.src = url;
      img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      wrap.appendChild(img);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = '\u00D7';
      btn.style.cssText = 'position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);color:#fff;border:none;font-size:14px;line-height:20px;text-align:center;cursor:pointer;padding:0;';
      btn.setAttribute('data-idx', String(i));
      btn.addEventListener('click', function () {
        portfolioUrls.splice(i, 1);
        renderPortfolio();
      });
      wrap.appendChild(btn);
      portfolioThumbsEl.appendChild(wrap);

      var hid = document.createElement('input');
      hid.type = 'hidden';
      hid.name = 'portfolio_url[]';
      hid.value = url;
      portfolioHiddenEl.appendChild(hid);
    });
  }

  document.querySelectorAll('.ac-portfolio-upload').forEach(function (input) {
    input.addEventListener('change', function () {
      if (!this.files || !this.files.length || !state.userId) return;
      var files = Array.from(this.files);
      var remaining = 12 - portfolioUrls.length;
      if (remaining <= 0) {
        alert('Maximum 12 portfolio images.');
        this.value = '';
        return;
      }
      files = files.slice(0, remaining);
      this.disabled = true;
      var pending = files.length;
      var self = this;
      files.forEach(function (file) {
        var fd = new FormData();
        fd.append('file', file);
        fd.append('user_id', String(state.userId));
        fd.append('kind', 'listing');
        fetch(uploadApi, { method: 'POST', body: fd, credentials: 'same-origin' })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok && data.url && portfolioUrls.length < 12) {
              portfolioUrls.push(data.url);
              renderPortfolio();
            } else if (!data.ok) {
              alert(data.error || 'Upload failed');
            }
          })
          .catch(function () { alert('Upload failed'); })
          .finally(function () {
            pending--;
            if (pending <= 0) { self.disabled = false; self.value = ''; }
          });
      });
    });
  });

  function collectFormData() {
    setFieldsEnabled();
    var form = $('ac-form');
    var fd = new FormData(form);
    var obj = {};
    fd.forEach(function (v, k) {
      if (obj[k] !== undefined) {
        if (!Array.isArray(obj[k])) obj[k] = [obj[k]];
        obj[k].push(v);
      } else {
        obj[k] = v;
      }
    });
    return obj;
  }

  $('ac-to-review').addEventListener('click', function () {
    formDataCache = collectFormData();
    var html = '<p><strong>Member:</strong> ' + esc(state.userLabel) + '</p>';
    html += '<p><strong>Type:</strong> ' + esc(state.contentType) + '</p>';
    html += '<dl class="mt-2 space-y-1">';
    Object.keys(formDataCache).forEach(function (k) {
      if (k === 'user_id' || k === 'content_type') return;
      var v = formDataCache[k];
      if (typeof v === 'string' && v !== '') {
        html += '<dt class="font-semibold text-slate-700">' + esc(k) + '</dt><dd class="mb-2 break-all text-slate-600">' + esc(v) + '</dd>';
      }
    });
    html += '</dl>';
    $('ac-review-body').innerHTML = html;

    var hidden = $('ac-save-hidden');
    hidden.innerHTML = '';
    Object.keys(formDataCache).forEach(function (k) {
      var v = formDataCache[k];
      if (k === 'portfolio_url[]') return;
      if (Array.isArray(v)) v = v[v.length - 1];
      var inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = k;
      inp.value = v;
      hidden.appendChild(inp);
    });
    portfolioUrls.forEach(function (url) {
      var inp = document.createElement('input');
      inp.type = 'hidden';
      inp.name = 'portfolio_url[]';
      inp.value = url;
      hidden.appendChild(inp);
    });
    var ct = document.createElement('input');
    ct.type = 'hidden';
    ct.name = 'content_type';
    ct.value = state.contentType;
    hidden.appendChild(ct);
    var uid = document.createElement('input');
    uid.type = 'hidden';
    uid.name = 'user_id';
    uid.value = String(state.userId);
    hidden.appendChild(uid);

    setStep(4);
  });

  if (cfg.prefillUserId) {
    selectUser(cfg.prefillUserId, cfg.prefillUserLabel || 'User #' + cfg.prefillUserId);
    if (cfg.prefillType) {
      showFormForType(cfg.prefillType);
    }
  } else {
    setStep(1);
  }
})();

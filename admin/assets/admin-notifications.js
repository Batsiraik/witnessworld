(function () {
  var root = document.getElementById('admin-notif-root');
  if (!root) return;

  var apiUrl = root.getAttribute('data-api-url') || '';
  var adminBase = root.getAttribute('data-admin-base') || '';
  var btn = document.getElementById('admin-notif-btn');
  var panel = document.getElementById('admin-notif-panel');
  var badge = document.getElementById('admin-notif-badge');
  var listEl = document.getElementById('admin-notif-list');
  var emptyEl = document.getElementById('admin-notif-empty');
  var markAllBtn = document.getElementById('admin-notif-mark-all');
  if (!btn || !panel || !listEl || !apiUrl) return;

  var pollMs = 20000;
  var lastUnread = -1;
  var latestId = 0;
  var panelOpen = false;
  var audioReady = false;
  var pollTimer = null;

  document.addEventListener(
    'click',
    function unlockAudio() {
      audioReady = true;
    },
    { once: true, capture: true }
  );

  function playBeep() {
    if (!audioReady) return;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      var ctx = new Ctx();
      function tone(freq, start, dur) {
        var o = ctx.createOscillator();
        var g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        o.start(start);
        o.stop(start + dur);
      }
      var t = ctx.currentTime;
      tone(880, t, 0.12);
      tone(660, t + 0.14, 0.16);
    } catch (e) {
      /* ignore */
    }
  }

  function fmtWhen(iso) {
    if (!iso) return '';
    var d = new Date(String(iso).replace(' ', 'T'));
    if (isNaN(d.getTime())) return iso;
    var now = new Date();
    var mins = Math.floor((now - d) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    var hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function setBadge(count) {
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : String(count);
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  function renderList(items) {
    listEl.innerHTML = '';
    if (!items || !items.length) {
      if (emptyEl) emptyEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    items.forEach(function (n) {
      var a = document.createElement('a');
      var href = n.link_url ? adminBase + n.link_url : adminBase + 'customer_support.php';
      a.href = href;
      a.className =
        'block border-b border-slate-100 px-4 py-3 transition hover:bg-slate-50' +
        (n.is_read ? '' : ' bg-brand/5');
      a.innerHTML =
        '<p class="text-sm font-semibold text-slate-900">' +
        escapeHtml(n.title || 'Notification') +
        '</p>' +
        (n.body
          ? '<p class="mt-0.5 text-xs text-slate-600 line-clamp-2">' + escapeHtml(n.body) + '</p>'
          : '') +
        '<p class="mt-1 text-[11px] font-medium text-slate-400">' +
        escapeHtml(fmtWhen(n.created_at)) +
        '</p>';
      listEl.appendChild(a);
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fetchNotifications(playSound) {
    var url = apiUrl;
    if (latestId > 0) {
      url += (url.indexOf('?') >= 0 ? '&' : '?') + 'since_id=' + encodeURIComponent(String(latestId));
    }
    return fetch(url, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.ok) return;
        var unread = typeof data.unread_count === 'number' ? data.unread_count : 0;
        if (playSound && lastUnread >= 0 && unread > lastUnread) {
          playBeep();
        } else if (playSound && data.has_new && lastUnread >= 0) {
          playBeep();
        }
        lastUnread = unread;
        if (typeof data.latest_id === 'number' && data.latest_id > latestId) {
          latestId = data.latest_id;
        }
        setBadge(unread);
        if (panelOpen) {
          renderList(data.notifications || []);
        }
        var supportBadge = document.getElementById('admin-support-nav-badge');
        if (supportBadge) {
          if (unread > 0) {
            supportBadge.textContent = unread > 99 ? '99+' : String(unread);
            supportBadge.classList.remove('hidden');
          } else {
            supportBadge.classList.add('hidden');
          }
        }
      })
      .catch(function () {
        /* silent */
      });
  }

  function openPanel() {
    panelOpen = true;
    panel.classList.remove('hidden');
    fetchNotifications(false).then(function () {
      return fetch(apiUrl, { credentials: 'same-origin', cache: 'no-store' })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.ok) renderList(data.notifications || []);
        });
    });
  }

  function closePanel() {
    panelOpen = false;
    panel.classList.add('hidden');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    audioReady = true;
    if (panel.classList.contains('hidden')) openPanel();
    else closePanel();
  });

  document.addEventListener('click', function (e) {
    if (!root.contains(e.target)) closePanel();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePanel();
  });

  if (markAllBtn) {
    markAllBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      fetch(apiUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' }),
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.ok) {
            lastUnread = data.unread_count || 0;
            setBadge(lastUnread);
            fetchNotifications(false);
          }
        });
    });
  }

  fetchNotifications(false);
  pollTimer = window.setInterval(function () {
    fetchNotifications(true);
  }, pollMs);

  window.addEventListener('beforeunload', function () {
    if (pollTimer) window.clearInterval(pollTimer);
  });
})();

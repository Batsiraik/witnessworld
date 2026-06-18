/**
 * Client-side product cart — mirrors mobile ShoppingCartContext (ww_shopping_cart_v1).
 */
(function (global) {
  const STORAGE_KEY = 'ww_shopping_cart_v1';
  const OLD_KEY = 'wwc_cart';
  const listeners = new Set();

  function lineKey(line) {
    return `${line.subject_type}:${line.subject_id}`;
  }

  function parseAmount(amount) {
    if (amount == null || amount === '') return 0;
    const n = Number.parseFloat(amount);
    return Number.isFinite(n) ? n : 0;
  }

  function readLines() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return cleanLines(parsed);
      }
      const legacy = localStorage.getItem(OLD_KEY);
      if (legacy) {
        const old = JSON.parse(legacy);
        if (Array.isArray(old) && old.length) {
          const migrated = old.map((item) => ({
            subject_type: 'product',
            subject_id: Number(item.product_id),
            title: String(item.name || 'Product'),
            image_url: null,
            unit_price: item.price != null ? String(item.price) : null,
            currency: String(item.currency || 'USD'),
            quantity: Math.max(1, Math.min(99, Number(item.qty) || 1)),
          })).filter((l) => l.subject_id > 0);
          if (migrated.length) {
            writeLines(migrated);
            localStorage.removeItem(OLD_KEY);
            return migrated;
          }
        }
      }
    } catch {
      /* ignore */
    }
    return [];
  }

  function cleanLines(arr) {
    const out = [];
    for (const item of arr) {
      if (!item || typeof item !== 'object') continue;
      if (item.subject_type !== 'product') continue;
      const id = Math.floor(Number(item.subject_id));
      if (!Number.isFinite(id) || id <= 0) continue;
      out.push({
        subject_type: 'product',
        subject_id: id,
        title: String(item.title ?? 'Product'),
        image_url: typeof item.image_url === 'string' ? item.image_url : null,
        unit_price: typeof item.unit_price === 'string' ? item.unit_price : item.unit_price != null ? String(item.unit_price) : null,
        currency: typeof item.currency === 'string' && item.currency ? item.currency : 'USD',
        quantity: Math.max(1, Math.min(99, Math.floor(Number(item.quantity) || 1))),
      });
    }
    return out;
  }

  function writeLines(lines) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore */
    }
    notify();
  }

  function notify() {
    listeners.forEach((fn) => {
      try { fn(); } catch { /* */ }
    });
    updateShellBadge();
    renderFloatingBar();
  }

  function getLines() {
    return readLines();
  }

  function getStats() {
    const lines = readLines();
    let unitCount = 0;
    const subtotals = {};
    for (const l of lines) {
      unitCount += l.quantity;
      const cur = l.currency || 'USD';
      subtotals[cur] = (subtotals[cur] ?? 0) + parseAmount(l.unit_price) * l.quantity;
    }
    return { lines, lineCount: lines.length, unitCount, subtotals };
  }

  function addProduct(input) {
    if (!global.WWC_AUTH?.requireAuth?.('Sign in to add items to your cart.')) return false;
    const qtyIn = Math.max(1, Math.min(99, Math.floor(input.quantity ?? 1)));
    const key = lineKey({ subject_type: 'product', subject_id: input.subject_id });
    const prev = readLines();
    let found = false;
    const next = prev.map((l) => {
      if (lineKey(l) !== key) return l;
      found = true;
      return { ...l, quantity: Math.min(99, l.quantity + qtyIn) };
    });
    if (!found) {
      next.push({
        subject_type: 'product',
        subject_id: input.subject_id,
        title: input.title,
        image_url: input.image_url ?? null,
        unit_price: input.unit_price ?? null,
        currency: input.currency || 'USD',
        quantity: qtyIn,
      });
    }
    writeLines(next);
    return true;
  }

  function setLineQuantity(subjectId, quantity) {
    const q = Math.max(1, Math.min(99, Math.floor(quantity) || 1));
    const next = readLines()
      .map((l) => (l.subject_id === subjectId ? { ...l, quantity: q } : l))
      .filter((l) => l.quantity > 0);
    writeLines(next);
  }

  function removeLine(subjectId) {
    writeLines(readLines().filter((l) => l.subject_id !== subjectId));
  }

  function clearCart() {
    writeLines([]);
  }

  function formatMoney(amount, currency) {
    const cur = currency || 'USD';
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount);
    } catch {
      return `${cur} ${Number(amount).toFixed(2)}`;
    }
  }

  function formatSubtotals(subtotals) {
    const entries = Object.entries(subtotals).filter(([, v]) => v > 0);
    if (!entries.length) return '—';
    return entries.map(([c, v]) => formatMoney(v, c)).join(' · ');
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function updateShellBadge() {
    const { unitCount } = getStats();
    document.querySelectorAll('[data-shell-cart-badge]').forEach((el) => {
      if (unitCount > 0) {
        el.textContent = unitCount > 99 ? '99+' : String(unitCount);
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }

  function renderFloatingBar() {
    const hideOn = /\/(cart|checkout|request|hire)\.html/i;
    if (hideOn.test(window.location.pathname)) {
      document.getElementById('wwc-cart-bar')?.remove();
      return;
    }
    const { unitCount, subtotals } = getStats();
    let bar = document.getElementById('wwc-cart-bar');
    if (unitCount <= 0) {
      bar?.remove();
      return;
    }
    const summary = formatSubtotals(subtotals);
    const html = `
      <div class="wwc-cart-bar" id="wwc-cart-bar" role="region" aria-label="Cart summary">
        <div class="wwc-cart-bar-inner">
          <span class="wwc-cart-bar-label">${unitCount} item${unitCount === 1 ? '' : 's'} · ${summary}</span>
          <a href="cart.html" class="wwc-btn wwc-btn-sm wwc-btn-primary">View cart</a>
        </div>
      </div>`;
    if (!bar) {
      document.body.insertAdjacentHTML('beforeend', html);
    } else {
      bar.outerHTML = html;
    }
  }

  function bindShell() {
    document.querySelectorAll('[data-shell-cart]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!global.WWC_AUTH?.requireAuth?.('Sign in to view your cart.')) return;
        window.location.href = 'cart.html';
      });
    });
    updateShellBadge();
    renderFloatingBar();
  }

  global.WWC_CART = {
    getLines,
    getStats,
    addProduct,
    setLineQuantity,
    removeLine,
    clearCart,
    formatMoney,
    formatSubtotals,
    subscribe,
    bindShell,
    renderFloatingBar,
  };
})(window);

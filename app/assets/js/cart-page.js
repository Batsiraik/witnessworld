(function () {
  const root = document.getElementById('cart-root');
  const { escapeHtml, escapeAttr } = WWC_UTIL;
  const { resolveMediaUrl } = WWC_API;
  const cart = WWC_CART;

  function render() {
    const { lines, unitCount, subtotals } = cart.getStats();
    if (!lines.length) {
      root.innerHTML = `
        <p class="wwc-empty">Your cart is empty.</p>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <a href="products.html" class="wwc-btn wwc-btn-primary">Browse products</a>
          <a href="stores.html" class="wwc-btn wwc-btn-ghost">Browse stores</a>
        </div>`;
      return;
    }

    const lineHtml = lines.map((l) => {
      const img = l.image_url ? resolveMediaUrl(l.image_url) : '';
      const price = l.unit_price ? cart.formatMoney(parseFloat(l.unit_price) * l.quantity, l.currency) : 'Contact for price';
      return `
        <div class="wwc-cart-line" data-id="${l.subject_id}">
          <div class="wwc-cart-line-img">${img ? `<img src="${escapeAttr(img)}" alt="" />` : ''}</div>
          <div class="wwc-cart-line-body">
            <p class="wwc-cart-line-title">${escapeHtml(l.title)}</p>
            <p class="wwc-cart-line-price">${escapeHtml(price)}</p>
            <a href="product.html?id=${l.subject_id}" style="font-size:12px;font-weight:800;color:var(--wwc-primary-dark)">View product</a>
          </div>
          <div class="wwc-cart-line-actions">
            <div class="wwc-cart-qty">
              <button type="button" data-qty-minus aria-label="Decrease">−</button>
              <span>${l.quantity}</span>
              <button type="button" data-qty-plus aria-label="Increase">+</button>
            </div>
            <button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" data-remove>Remove</button>
          </div>
        </div>`;
    }).join('');

    root.innerHTML = `
      ${lineHtml}
      <div class="wwc-cart-summary">
        <div class="wwc-cart-summary-row">
          <span>${unitCount} item${unitCount === 1 ? '' : 's'}</span>
          <span>${escapeHtml(cart.formatSubtotals(subtotals))}</span>
        </div>
      </div>
      <p style="font-size:13px;color:var(--wwc-text-muted);font-weight:600;line-height:1.5;margin-bottom:16px">
        Each product becomes a separate order so store owners can fulfill and update status independently.
      </p>
      <a href="checkout.html" class="wwc-btn wwc-btn-primary wwc-btn-block">Proceed to checkout</a>`;

    root.querySelectorAll('.wwc-cart-line').forEach((row) => {
      const id = Number(row.getAttribute('data-id'));
      row.querySelector('[data-qty-minus]')?.addEventListener('click', () => {
        const line = cart.getLines().find((l) => l.subject_id === id);
        if (!line) return;
        if (line.quantity <= 1) cart.removeLine(id);
        else cart.setLineQuantity(id, line.quantity - 1);
        render();
      });
      row.querySelector('[data-qty-plus]')?.addEventListener('click', () => {
        const line = cart.getLines().find((l) => l.subject_id === id);
        if (!line) return;
        cart.setLineQuantity(id, line.quantity + 1);
        render();
      });
      row.querySelector('[data-remove]')?.addEventListener('click', () => {
        cart.removeLine(id);
        render();
      });
    });
  }

  WWC_PAGE.init({ requireAuth: true, onReady: render });
  cart.subscribe(render);
})();

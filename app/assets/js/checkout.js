(function () {
  const root = document.getElementById('checkout-root');
  const { apiPost } = WWC_API;
  const { escapeHtml } = WWC_UTIL;
  const F = WWC_COMMERCE;
  const cart = WWC_CART;

  function renderForm() {
    const { lines } = cart.getStats();
    if (!lines.length) {
      root.innerHTML = `
        <p class="wwc-empty">Your cart is empty.</p>
        <a href="products.html" class="wwc-btn wwc-btn-primary" style="margin-top:12px">Browse products</a>`;
      return;
    }

    const c = F.defaultContact();
    const summary = lines.map((l) => `${l.title} × ${l.quantity}`).join('\n');

    root.innerHTML = `
      <div class="wwc-create-form">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">Checkout</h1>
        <p class="wwc-create-lead">We create one order per product line so each store owner can fulfill and update status separately.</p>
        <form id="checkout-form">
          ${F.contactSectionHtml(c)}
          ${F.shippingSectionHtml(c)}
          <div class="wwc-create-section">
            <h2>Note to sellers (optional)</h2>
            <div class="wwc-create-field">
              <textarea id="order-note" placeholder="Delivery instructions or questions for the shop."></textarea>
            </div>
          </div>
          ${F.antiScamHtml()}
          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Place orders</button>
            <a href="cart.html" class="wwc-btn wwc-btn-ghost">Back to cart</a>
          </div>
          <p class="wwc-create-error" id="form-error" hidden></p>
        </form>
      </div>`;

    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('form-error');
      errEl.hidden = true;
      const contact = F.readContact();
      if (!contact.buyer_name) {
        errEl.textContent = 'Please add your name.';
        errEl.hidden = false;
        return;
      }
      const shipping = F.readShipping(contact.buyer_name);
      if (!shipping.address1 || !shipping.city || !shipping.country) {
        errEl.textContent = 'Please add your full shipping address.';
        errEl.hidden = false;
        return;
      }
      if (!F.isAcked()) {
        errEl.textContent = 'Please confirm the safety reminder before sending.';
        errEl.hidden = false;
        return;
      }

      const note = document.getElementById('order-note')?.value.trim() || '';
      const brief = [note, summary ? `Order summary:\n${summary}` : ''].filter(Boolean).join('\n\n');
      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      try {
        for (const line of lines) {
          await apiPost('commerce-request-create.php', {
            subject_type: 'product',
            subject_id: line.subject_id,
            quantity: line.quantity,
            buyer_name: contact.buyer_name,
            buyer_email: contact.buyer_email,
            buyer_phone: contact.buyer_phone,
            project_brief: brief,
            preferred_contact: 'WWC website chat',
            anti_scam_ack: true,
            shipping,
          });
        }
        cart.clearCart();
        root.innerHTML = `
          <div class="wwc-create-form">
            <div class="wwc-create-success">Requests sent. Each seller has been notified.</div>
            <div class="wwc-create-actions">
              <a href="orders.html" class="wwc-btn wwc-btn-primary">My orders</a>
              <a href="index.html" class="wwc-btn wwc-btn-ghost">Go to home</a>
            </div>
          </div>`;
      } catch (ex) {
        errEl.textContent = ex.message || 'Could not complete checkout.';
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Place orders';
      }
    });
  }

  WWC_PAGE.init({ requireAuth: true, onReady: renderForm });
})();

(function () {
  const root = document.getElementById('request-root');
  const { apiPost } = WWC_API;
  const { qs, escapeHtml } = WWC_UTIL;
  const F = WWC_COMMERCE;

  const subjectType = (qs('subject_type') || qs('type') || '').toLowerCase();
  const subjectId = WWC_UTIL.qsInt('subject_id') || WWC_UTIL.qsInt('id');

  function renderInvalid(msg) {
    root.innerHTML = `<p class="wwc-empty">${escapeHtml(msg)}</p>`;
  }

  function renderForm() {
    const allowed = ['listing', 'directory_entry', 'product'];
    if (!allowed.includes(subjectType) || subjectId <= 0) {
      renderInvalid('Invalid request link.');
      return;
    }

    const copy = F.subjectCopy(subjectType);
    const c = F.defaultContact();

    root.innerHTML = `
      <div class="wwc-create-form">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">${escapeHtml(copy.title)}</h1>
        <p class="wwc-create-lead">${escapeHtml(copy.lead)}</p>
        <form id="request-form">
          ${F.contactSectionHtml(c)}
          ${copy.needsShipping ? `
            <div class="wwc-create-section">
              <h2>Quantity</h2>
              <div class="wwc-create-field">
                <input id="quantity" type="number" min="1" max="99" value="1" />
              </div>
            </div>
            ${F.shippingSectionHtml(c)}` : F.hireSectionHtml()}
          ${F.antiScamHtml()}
          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Send request</button>
          </div>
          <p class="wwc-create-error" id="form-error" hidden></p>
        </form>
      </div>`;

    document.getElementById('request-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('form-error');
      errEl.hidden = true;
      const contact = F.readContact();
      if (!contact.buyer_name) {
        errEl.textContent = 'Please add your name.';
        errEl.hidden = false;
        return;
      }
      if (!F.isAcked()) {
        errEl.textContent = 'Please confirm the safety reminder before sending.';
        errEl.hidden = false;
        return;
      }

      const body = {
        subject_type: subjectType,
        subject_id: subjectId,
        buyer_name: contact.buyer_name,
        buyer_email: contact.buyer_email,
        buyer_phone: contact.buyer_phone,
        anti_scam_ack: true,
        shipping: { name: '', address1: '', address2: '', city: '', state: '', postal_code: '', country: '' },
      };

      if (copy.needsShipping) {
        const shipping = F.readShipping(contact.buyer_name);
        if (!shipping.address1 || !shipping.city || !shipping.country) {
          errEl.textContent = 'Please add your shipping address.';
          errEl.hidden = false;
          return;
        }
        body.quantity = Math.max(1, Math.min(99, Number(document.getElementById('quantity')?.value) || 1));
        body.shipping = shipping;
        body.project_brief = '';
        body.preferred_contact = 'WWC website chat';
      } else {
        const hire = F.readHireFields();
        if (!hire.project_brief) {
          errEl.textContent = 'Please describe what you need.';
          errEl.hidden = false;
          return;
        }
        body.quantity = 1;
        body.project_brief = hire.project_brief;
        body.preferred_contact = hire.preferred_contact;
      }

      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        await apiPost('commerce-request-create.php', body);
        root.innerHTML = `
          <div class="wwc-create-form">
            <div class="wwc-create-success">Request sent. The seller has been notified.</div>
            <div class="wwc-create-actions">
              <a href="orders.html" class="wwc-btn wwc-btn-primary">My orders</a>
              <a href="messages.html" class="wwc-btn wwc-btn-ghost">Messages</a>
            </div>
          </div>`;
      } catch (ex) {
        errEl.textContent = ex.message || 'Could not send request.';
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Send request';
      }
    });
  }

  WWC_PAGE.init({ requireAuth: true, onReady: renderForm });
})();

(function () {
  const root = document.getElementById('hire-root');
  const { apiPost } = WWC_API;
  const { qs, escapeHtml } = WWC_UTIL;
  const F = WWC_COMMERCE;

  const peerUserId = WWC_UTIL.qsInt('peer_user_id') || WWC_UTIL.qsInt('user_id');
  const username = qs('username') || '';

  function renderForm() {
    if (peerUserId <= 0) {
      root.innerHTML = '<p class="wwc-empty">Open hire from a member profile or chat.</p>';
      return;
    }

    const copy = F.subjectCopy('member');
    const c = F.defaultContact();
    const who = username ? `@${escapeHtml(username)}` : 'this member';

    root.innerHTML = `
      <div class="wwc-create-form">
        <h1 style="margin:0 0 8px;font-size:22px;font-weight:800">Hire ${who}</h1>
        <p class="wwc-create-lead">${escapeHtml(copy.lead)}</p>
        <form id="hire-form">
          ${F.contactSectionHtml(c)}
          ${F.hireSectionHtml()}
          ${F.antiScamHtml()}
          <div class="wwc-create-actions">
            <button type="submit" class="wwc-btn wwc-btn-primary" id="submit-btn">Send hire request</button>
          </div>
          <p class="wwc-create-error" id="form-error" hidden></p>
        </form>
      </div>`;

    document.getElementById('hire-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = document.getElementById('form-error');
      errEl.hidden = true;
      const contact = F.readContact();
      const hire = F.readHireFields();
      if (!contact.buyer_name || !hire.project_brief) {
        errEl.textContent = 'Please add your name and describe what you need.';
        errEl.hidden = false;
        return;
      }
      if (!F.isAcked()) {
        errEl.textContent = 'Please confirm the safety reminder before sending.';
        errEl.hidden = false;
        return;
      }

      const btn = document.getElementById('submit-btn');
      btn.disabled = true;
      btn.textContent = 'Sending…';
      try {
        await apiPost('commerce-request-create.php', {
          subject_type: 'member',
          subject_id: peerUserId,
          buyer_name: contact.buyer_name,
          buyer_email: contact.buyer_email,
          buyer_phone: contact.buyer_phone,
          project_brief: hire.project_brief,
          preferred_contact: hire.preferred_contact,
          anti_scam_ack: true,
        });
        root.innerHTML = `
          <div class="wwc-create-form">
            <div class="wwc-create-success">Request sent. The member has been notified.</div>
            <div class="wwc-create-actions">
              <a href="orders.html" class="wwc-btn wwc-btn-primary">My orders</a>
              <a href="messages.html" class="wwc-btn wwc-btn-ghost">Messages</a>
            </div>
          </div>`;
      } catch (ex) {
        errEl.textContent = ex.message || 'Could not send request.';
        errEl.hidden = false;
        btn.disabled = false;
        btn.textContent = 'Send hire request';
      }
    });
  }

  WWC_PAGE.init({ requireAuth: true, onReady: renderForm });
})();

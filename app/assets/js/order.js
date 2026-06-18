(function () {
  const root = document.getElementById('order-root');
  const id = WWC_UTIL.qsInt('id');
  const { apiGet, apiPost, resolveMediaUrl } = WWC_API;
  const { escapeHtml, escapeAttr, formatTime } = WWC_UTIL;
  const F = WWC_COMMERCE;

  function subjectLink(r) {
    const t = r.subject_type;
    const sid = r.subject_id;
    if (t === 'listing') return `listing.html?id=${sid}`;
    if (t === 'product') return `product.html?id=${sid}`;
    if (t === 'directory_entry') return `directory-entry.html?id=${sid}`;
    return null;
  }

  function subjectLabel(t) {
    if (t === 'listing') return 'View full listing';
    if (t === 'product') return 'View product page';
    if (t === 'directory_entry') return 'View directory listing';
    if (t === 'member') return 'View profile';
    return 'View item';
  }

  async function openChat(r, asBuyer) {
    const peerId = asBuyer ? r.seller_user_id : r.buyer_user_id;
    const ctxMap = { listing: 'listing', product: 'product', directory_entry: 'directory_entry' };
    const ctx = ctxMap[r.subject_type] || 'general';
    try {
      const body = { peer_user_id: peerId, context_type: ctx };
      if (ctx !== 'general') body.context_id = r.subject_id;
      const data = await apiPost('conversation-open.php', body);
      if (data.conversation_id) window.location.href = `chat.html?conversation_id=${data.conversation_id}`;
      else alert('Could not start conversation.');
    } catch (e) {
      alert(e.message);
    }
  }

  async function doAction(requestId, action, tracking) {
    try {
      await apiPost('commerce-request-action.php', {
        request_id: requestId,
        action,
        tracking_number: tracking || '',
      });
      await load();
    } catch (e) {
      alert(e.message);
    }
  }

  function actionBtn(label, action, cls) {
    return `<button type="button" class="wwc-btn wwc-btn-sm ${cls || 'wwc-btn-ghost'}" data-action="${action}">${escapeHtml(label)}</button>`;
  }

  function renderReviewModal(r) {
    return `
      <div class="wwc-modal-backdrop" id="review-modal" hidden>
        <div class="wwc-modal-sheet" role="dialog">
          <h2 class="wwc-modal-title">Review ${escapeHtml(r.subject_title)}</h2>
          <div class="wwc-create-field">
            <label>Rating</label>
            <select id="review-rating">
              <option value="5">5 — Excellent</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1 — Poor</option>
            </select>
          </div>
          <div class="wwc-create-field">
            <label>Title (optional)</label>
            <input id="review-title" maxlength="120" />
          </div>
          <div class="wwc-create-field">
            <label>Review *</label>
            <textarea id="review-body" required rows="4"></textarea>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button type="button" class="wwc-btn wwc-btn-primary" id="review-submit">Post review</button>
            <button type="button" class="wwc-btn wwc-btn-ghost" data-review-close>Cancel</button>
          </div>
        </div>
      </div>`;
  }

  async function load() {
    if (!id) {
      root.innerHTML = '<p class="wwc-empty">Invalid order link.</p>';
      return;
    }
    WWC_UTIL.showLoading(root);
    try {
      const data = await apiGet(`commerce-request-detail.php?id=${id}`);
      const r = data.request;
      const preview = data.subject_preview || {};
      if (!r) throw new Error('Not found');

      const user = WWC_AUTH.getUser();
      const myId = user?.id || 0;
      const isBuyer = r.buyer_user_id === myId;
      const isSeller = r.seller_user_id === myId;
      const status = r.status || '';
      const hero = resolveMediaUrl(preview.hero_image_url || r.subject_image_url);
      const headline = (preview.title || r.subject_title || 'Order').trim();
      const link = subjectLink(r);

      let actions = '';
      if (isBuyer) {
        if (['new', 'accepted'].includes(status)) actions += actionBtn('Cancel', 'cancel');
        if (['shipped', 'ready', 'in_progress'].includes(status)) actions += actionBtn('Mark received', 'delivered', 'wwc-btn-primary');
        if (['delivered', 'ready'].includes(status)) actions += actionBtn('Complete', 'complete', 'wwc-btn-primary');
        if (status === 'completed') actions += actionBtn('Leave review', 'review', 'wwc-btn-primary');
      }
      if (isSeller) {
        if (status === 'new') {
          actions += actionBtn('Accept', 'accept', 'wwc-btn-primary');
          actions += actionBtn('Decline', 'decline');
        }
        if (['accepted', 'ready'].includes(status)) actions += actionBtn('In progress', 'in_progress');
        if (['accepted', 'in_progress'].includes(status)) actions += actionBtn('Ready', 'ready');
        if (['accepted', 'in_progress', 'ready'].includes(status)) actions += actionBtn('Shipped', 'shipped', 'wwc-btn-primary');
      }
      if (!['completed', 'cancelled', 'declined'].includes(status)) {
        actions += actionBtn('Dispute', 'dispute', 'wwc-btn-ghost');
      }

      const shipping = [r.shipping_name, r.shipping_address1, r.shipping_address2, r.shipping_city, r.shipping_state, r.shipping_postal_code, r.shipping_country].filter(Boolean).join(', ');

      root.innerHTML = `
        ${isSeller && status === 'new' ? '<p style="padding:12px;background:#fff8e6;border-radius:12px;font-size:13px;font-weight:600;margin-bottom:16px">Review the item below, then message the buyer if needed before you accept or decline.</p>' : ''}
        ${hero ? `<img class="wwc-order-hero" src="${escapeAttr(hero)}" alt="" />` : ''}
        <p style="font-size:12px;font-weight:800;text-transform:uppercase;color:var(--wwc-text-muted);margin:0 0 6px">${escapeHtml(r.subject_type)} · ${escapeHtml(String(r.request_type || '').replace(/_/g, ' '))} · #${r.id}</p>
        <h1 class="wwc-detail-title">${escapeHtml(headline)}</h1>
        ${preview.meta_line ? `<p style="font-weight:700;color:var(--wwc-text-muted)">${escapeHtml(preview.meta_line)}</p>` : ''}
        <p style="margin:12px 0"><span class="wwc-order-status">${escapeHtml(F.statusLabel(status))}</span></p>
        ${preview.description ? `<div class="wwc-detail-body"><h3 style="margin:0 0 8px;font-size:14px">Description</h3><p class="wwc-detail-desc">${escapeHtml(preview.description)}</p></div>` : ''}
        ${link ? `<a href="${link}" class="wwc-btn wwc-btn-ghost" style="margin:12px 0">${escapeHtml(subjectLabel(r.subject_type))}</a>` : ''}
        ${r.unit_price ? `<p style="font-weight:800;margin:12px 0">${escapeHtml(r.currency)} ${escapeHtml(r.unit_price)} × ${r.quantity}</p>` : ''}
        <div class="wwc-detail-body">
          <h3 style="margin:0 0 8px;font-size:14px">People</h3>
          <p style="margin:0;font-weight:600">Buyer: ${escapeHtml(r.buyer_label || r.buyer_username || '—')}</p>
          <p style="margin:4px 0 0;font-weight:600">Seller: ${escapeHtml(r.seller_label || r.seller_username || '—')}</p>
          <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
            ${isSeller ? `<button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" id="msg-buyer">Message buyer</button>` : ''}
            ${isBuyer ? `<button type="button" class="wwc-btn wwc-btn-sm wwc-btn-ghost" id="msg-seller">Message seller</button>` : ''}
          </div>
        </div>
        ${r.tracking_number ? `<div class="wwc-detail-body"><h3 style="margin:0 0 8px;font-size:14px">Tracking</h3><p>${escapeHtml(r.tracking_number)}</p></div>` : ''}
        ${isSeller && ['accepted', 'in_progress', 'ready'].includes(status) ? `
          <div class="wwc-detail-body">
            <h3 style="margin:0 0 8px;font-size:14px">Tracking number</h3>
            <input id="tracking-input" value="${escapeAttr(r.tracking_number || '')}" placeholder="Optional — saved when you mark shipped" style="width:100%;padding:10px;border-radius:10px;border:1px solid var(--wwc-line)" />
          </div>` : ''}
        ${shipping ? `<div class="wwc-detail-body"><h3 style="margin:0 0 8px;font-size:14px">Shipping</h3><p style="margin:0;font-weight:600;line-height:1.5">${escapeHtml(shipping)}</p></div>` : ''}
        ${r.project_brief ? `<div class="wwc-detail-body"><h3 style="margin:0 0 8px;font-size:14px">Buyer message & notes</h3><p class="wwc-detail-desc">${escapeHtml(r.project_brief)}</p></div>` : ''}
        ${r.preferred_contact ? `<p style="font-size:13px;font-weight:600;color:var(--wwc-text-muted)">Preferred contact: ${escapeHtml(r.preferred_contact)}</p>` : ''}
        ${r.seller_note ? `<div class="wwc-detail-body"><h3 style="margin:0 0 8px;font-size:14px">Seller note</h3><p>${escapeHtml(r.seller_note)}</p></div>` : ''}
        <p style="font-size:12px;color:var(--wwc-text-muted);margin-top:16px">Created ${escapeHtml(formatTime(r.created_at))}</p>
        <div class="wwc-order-actions">${actions}</div>
        ${renderReviewModal(r)}`;

      document.getElementById('msg-buyer')?.addEventListener('click', () => openChat(r, false));
      document.getElementById('msg-seller')?.addEventListener('click', () => openChat(r, true));

      root.querySelectorAll('[data-action]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.getAttribute('data-action');
          if (action === 'review') {
            const modal = document.getElementById('review-modal');
            if (modal) modal.hidden = false;
            return;
          }
          if (action === 'cancel' && !confirm('Cancel this order? The seller will be notified.')) return;
          const tracking = document.getElementById('tracking-input')?.value.trim() || '';
          void doAction(id, action, tracking);
        });
      });

      const modal = document.getElementById('review-modal');
      modal?.querySelector('[data-review-close]')?.addEventListener('click', () => { modal.hidden = true; });
      modal?.addEventListener('click', (e) => { if (e.target === modal) modal.hidden = true; });
      document.getElementById('review-submit')?.addEventListener('click', async () => {
        const body = document.getElementById('review-body')?.value.trim();
        if (!body) { alert('Please write a short review.'); return; }
        try {
          await apiPost('content-review-create.php', {
            request_id: id,
            rating: Number(document.getElementById('review-rating')?.value) || 5,
            title: document.getElementById('review-title')?.value.trim() || '',
            body,
          });
          modal.hidden = true;
          alert('Review posted. Thank you!');
        } catch (e) {
          alert(e.message);
        }
      });
    } catch (e) {
      WWC_UTIL.showError(root, e.message, load);
    }
  }

  WWC_PAGE.init({
    requireAuth: true,
    onReady: async () => {
      const from = WWC_UTIL.qs('from');
      const back = document.getElementById('order-back');
      if (back && from === 'sales') {
        back.href = 'sales.html';
        back.innerHTML = '<ion-icon name="arrow-back-outline"></ion-icon> Sales dashboard';
      }
      await load();
    },
  });
})();

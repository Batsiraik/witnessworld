/**
 * Shared commerce request / checkout form helpers.
 */
(function (global) {
  const { escapeHtml, escapeAttr } = global.WWC_UTIL;

  const ANTI_SCAM_TEXT =
    'I understand WWC does not hold payment in V1. I will keep communication in the app, avoid off-platform pressure, and report suspicious behavior.';

  function defaultContact(user) {
    const u = user || global.WWC_AUTH?.getUser?.() || {};
    const name = [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
    return {
      name: name || '',
      email: u.email || '',
      phone: u.phone || '',
    };
  }

  function contactSectionHtml(c, idPrefix) {
    const p = idPrefix ? `${idPrefix}-` : '';
    return `
      <div class="wwc-create-section">
        <h2>Contact</h2>
        <div class="wwc-create-field">
          <label for="${p}buyer-name">Your name *</label>
          <input id="${p}buyer-name" required maxlength="120" value="${escapeAttr(c.name)}" />
        </div>
        <div class="wwc-create-field">
          <label for="${p}buyer-email">Email</label>
          <input id="${p}buyer-email" type="email" maxlength="200" value="${escapeAttr(c.email)}" />
        </div>
        <div class="wwc-create-field">
          <label for="${p}buyer-phone">Phone / WhatsApp</label>
          <input id="${p}buyer-phone" maxlength="40" value="${escapeAttr(c.phone)}" />
        </div>
      </div>`;
  }

  function shippingSectionHtml(c) {
    return `
      <div class="wwc-create-section">
        <h2>Shipping address</h2>
        <div class="wwc-create-field">
          <label for="ship-name">Recipient name</label>
          <input id="ship-name" maxlength="120" value="${escapeAttr(c.name)}" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-address1">Address line 1 *</label>
          <input id="ship-address1" required maxlength="200" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-address2">Address line 2</label>
          <input id="ship-address2" maxlength="200" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-city">City *</label>
          <input id="ship-city" required maxlength="100" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-state">State / province</label>
          <input id="ship-state" maxlength="80" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-postal">Postal code</label>
          <input id="ship-postal" maxlength="20" />
        </div>
        <div class="wwc-create-field">
          <label for="ship-country">Country *</label>
          <input id="ship-country" required maxlength="80" />
        </div>
      </div>`;
  }

  function hireSectionHtml() {
    return `
      <div class="wwc-create-section">
        <h2>Request details</h2>
        <div class="wwc-create-field">
          <label for="project-brief">What do you need? *</label>
          <textarea id="project-brief" required placeholder="Describe what you need, timeline, budget, pickup/meeting preference, or project details."></textarea>
        </div>
        <div class="wwc-create-field">
          <label for="preferred-contact">Preferred contact</label>
          <input id="preferred-contact" value="WWC website chat" maxlength="120" />
        </div>
      </div>`;
  }

  function antiScamHtml() {
    return `
      <label class="wwc-create-check wwc-commerce-ack">
        <input type="checkbox" id="anti-scam-ack" required />
        <span>${escapeHtml(ANTI_SCAM_TEXT)}</span>
      </label>`;
  }

  function readContact() {
    return {
      buyer_name: document.getElementById('buyer-name')?.value.trim() || '',
      buyer_email: document.getElementById('buyer-email')?.value.trim() || '',
      buyer_phone: document.getElementById('buyer-phone')?.value.trim() || '',
    };
  }

  function readShipping(buyerName) {
    const name = document.getElementById('ship-name')?.value.trim() || buyerName;
    return {
      name,
      address1: document.getElementById('ship-address1')?.value.trim() || '',
      address2: document.getElementById('ship-address2')?.value.trim() || '',
      city: document.getElementById('ship-city')?.value.trim() || '',
      state: document.getElementById('ship-state')?.value.trim() || '',
      postal_code: document.getElementById('ship-postal')?.value.trim() || '',
      country: document.getElementById('ship-country')?.value.trim() || '',
    };
  }

  function readHireFields() {
    return {
      project_brief: document.getElementById('project-brief')?.value.trim() || '',
      preferred_contact: document.getElementById('preferred-contact')?.value.trim() || 'WWC website chat',
    };
  }

  function isAcked() {
    return document.getElementById('anti-scam-ack')?.checked === true;
  }

  function subjectCopy(subjectType) {
    if (subjectType === 'product') {
      return {
        title: 'Request this product',
        lead: 'Send your shipping details to the seller. Payment stays outside WWC for now so both sides can confirm safely first.',
        needsShipping: true,
      };
    }
    if (subjectType === 'directory_entry') {
      return {
        title: 'Request this business',
        lead: 'Tell the business what you need. Keep communication inside WWC until you are comfortable moving forward.',
        needsShipping: false,
      };
    }
    if (subjectType === 'member') {
      return {
        title: 'Hire this member',
        lead: 'Describe the work or help you need. WWC keeps a record so scams and disputes can be reviewed.',
        needsShipping: false,
      };
    }
    return {
      title: 'Send hire / request',
      lead: 'Tell the provider what you need. WWC keeps a record so scams and disputes can be reviewed.',
      needsShipping: false,
    };
  }

  function statusLabel(status) {
    return String(status || '').replace(/_/g, ' ');
  }

  global.WWC_COMMERCE = {
    defaultContact,
    contactSectionHtml,
    shippingSectionHtml,
    hireSectionHtml,
    antiScamHtml,
    readContact,
    readShipping,
    readHireFields,
    isAcked,
    subjectCopy,
    statusLabel,
  };
})(window);

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Add Card | Secure Payment</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    /* -------------------------------
       RESET & GLOBAL (light, neutral)
    ------------------------------- */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background: #f8fafc;   /* very light cool grey background */
      font-family: system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Helvetica, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif;
      padding: 24px 20px;
      color: #1e293b;
    }

    /* main card container — clean, elevated but subtle */
    .card-container {
      max-width: 540px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 32px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.02), 0 2px 6px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.03);
      overflow: hidden;
      transition: all 0.2s ease;
    }

    .form-content {
      padding: 28px 24px 32px;
    }

    /* header area */
    h1 {
      font-size: 1.75rem;
      font-weight: 600;
      letter-spacing: -0.3px;
      background: linear-gradient(135deg, #1e293b 0%, #2d3a4f 100%);
      background-clip: text;
      -webkit-background-clip: text;
      color: transparent;
      margin-bottom: 8px;
    }

    .lead {
      font-size: 0.95rem;
      color: #5b6e8c;
      line-height: 1.4;
      margin-bottom: 28px;
      border-left: 3px solid #e2e8f0;
      padding-left: 14px;
    }

    /* Stripe Elements field wrappers */
    .field-group {
      margin-bottom: 20px;
    }

    .field-label {
      display: block;
      font-size: 0.8rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #5b6e8c;
      margin-bottom: 6px;
    }

    /* Stripe iframe container styling — clean borders, soft focus */
    .stripe-input {
      background: #ffffff;
      border: 1.5px solid #e2edf2;
      border-radius: 20px;
      padding: 12px 16px;
      transition: all 0.2s cubic-bezier(0.2, 0.8, 0.4, 1);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    /* on hover subtle indication */
    .stripe-input:hover {
      border-color: #cbdde6;
      background-color: #fefefe;
    }

    /* when Stripe inner field is focused, we mimic a clean glow */
    .stripe-input--focus {
      border-color: #a0c0d4;
      box-shadow: 0 0 0 3px rgba(100, 150, 200, 0.1);
      outline: none;
    }

    /* Split row for expiry & cvc */
    .row-split {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .row-split .field-group {
      flex: 1;
      margin-bottom: 0;
    }

    /* error message area */
    .error-message {
      background: #fff6f5;
      border-radius: 18px;
      padding: 10px 16px;
      margin: 16px 0 8px;
      font-size: 0.8rem;
      color: #d0302f;
      border-left: 3px solid #d0302f;
      font-weight: 450;
      transition: all 0.1s;
    }

    /* primary button — light, modern, subtle but confident */
    .btn-primary {
      width: 100%;
      background: #1f2a3e;
      border: none;
      padding: 14px 18px;
      border-radius: 44px;
      font-weight: 600;
      font-size: 1rem;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 8px;
      font-family: inherit;
      letter-spacing: 0.2px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }

    .btn-primary:hover {
      background: #2d3a55;
      transform: scale(0.98);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    }

    .btn-primary:active {
      transform: scale(0.97);
      background: #141e2f;
    }

    .btn-primary:disabled {
      background: #b9c2d0;
      cursor: not-allowed;
      transform: none;
      opacity: 0.7;
    }

    /* cancel link – minimal & clean */
    .cancel-wrapper {
      text-align: center;
      margin-top: 20px;
    }
    .cancel-link {
      display: inline-block;
      font-size: 0.9rem;
      color: #7c8ba0;
      text-decoration: none;
      padding: 6px 12px;
      border-radius: 40px;
      transition: background 0.15s;
    }
    .cancel-link:hover {
      background: #f0f4f9;
      color: #3b4d66;
      text-decoration: none;
    }

    /* additional micro spacing */
    hr {
      margin: 20px 0 0;
      border: none;
      border-top: 1px solid #ecf3f8;
    }

    /* improve placeholder / text inside Stripe iframes via default appearance – 
       Stripe uses its own internal placeholders (Card number, MM / YY, CVC) but we
       can nudge the container background and font smoothing */
    .stripe-input iframe {
      vertical-align: middle;
      font-family: inherit;
    }

    /* small responsive */
    @media (max-width: 480px) {
      body { padding: 16px; }
      .form-content { padding: 20px 20px 28px; }
      h1 { font-size: 1.55rem; }
    }

    /* subtle brand lockup */
    .badge-secure {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 0.7rem;
      color: #8da0b0;
      margin-top: 18px;
      letter-spacing: 0.2px;
    }
    .badge-secure svg {
      opacity: 0.7;
    }
  </style>
</head>
<body>
<div class="card-container">
  <div class="form-content">
    <h1>✨ Add payment method</h1>
    <div class="lead">
      Encrypted & secure · saved for membership billing
    </div>

    <form id="payment-form">
      <!-- Card number field -->
      <div class="field-group">
        <div class="field-label">Card number</div>
        <div id="card-number" class="stripe-input"></div>
      </div>

      <!-- Expiry & CVC inline -->
      <div class="row-split">
        <div class="field-group">
          <div class="field-label">Expiry date</div>
          <div id="card-expiry" class="stripe-input"></div>
        </div>
        <div class="field-group">
          <div class="field-label">CVC</div>
          <div id="card-cvc" class="stripe-input"></div>
        </div>
      </div>

      <!-- Dynamic error message -->
      <div id="card-errors" role="alert" class="error-message" style="display: none;"></div>

      <button type="submit" id="submit-btn" class="btn-primary">✓ Save card</button>
    </form>

    <div class="cancel-wrapper">
      <a href="#" id="cancel-link" class="cancel-link">← Cancel & return to app</a>
    </div>
    <div class="badge-secure">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9v4c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M12 11v3m0 2v.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>PCI compliant · Stripe Elements</span>
    </div>
  </div>
</div>

<script>
  (function() {
    // ======================
    // Retrieve backend data (injected from PHP)
    // ======================
    // IMPORTANT: these placeholders will be replaced by actual PHP values at runtime.
    // For design preview we keep dummy strings but they will be overridden by server.
    // Since it's a PHP template, all {$xxx} are replaced before delivering to browser.
    // The code below uses the exact same variables as the original.
    let pk = {$pkJs};
    let clientSecret = {$csJs};
    let embedT = {$tJs};
    let setupIntentId = {$setiJs};
    let completeUrl = {$completeJs};
    
    // Fallback guard (just in case something is undefined, but server ensures valid)
    if (!pk || !clientSecret) {
      document.getElementById('card-errors').innerText = 'Configuration error. Please close and try again.';
      document.getElementById('card-errors').style.display = 'block';
    }

    // Initialize Stripe with publishable key
    const stripe = Stripe(pk);
    const elements = stripe.elements({
      fonts: [],
      locale: 'auto'
    });

    // Create individual card components – with custom styling to achieve
    // clean & modern "light" look, no dark blue, neutral borders, consistent fonts
    // We'll style placeholder text, input text, and more via style options.
    // This also ensures typing preview (like card number, expiry) appears crisp and modern.
    const elementStyle = {
      base: {
        fontSize: '16px',
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        color: '#1e293b',
        fontWeight: '450',
        '::placeholder': {
          color: '#a5b7ca',
          fontWeight: '400',
          fontSize: '15px',
        },
        ':focus': {
          color: '#0f172a',
        },
        ':-webkit-autofill': {
          color: '#1f2a3e',
        },
      },
      invalid: {
        color: '#d0302f',
        iconColor: '#d0302f',
        '::placeholder': {
          color: '#f2bfbf',
        }
      },
      complete: {
        color: '#1f2f47',
      }
    };

    // Create each element with the refined style & individual placeholders
    const cardNumber = elements.create('cardNumber', {
      style: elementStyle,
      showIcon: true,       // subtle card brand icon (clean & helpful)
      placeholder: '1234 5678 9012 3456',
    });
    const cardExpiry = elements.create('cardExpiry', {
      style: elementStyle,
      placeholder: 'MM / YY',
    });
    const cardCvc = elements.create('cardCvc', {
      style: elementStyle,
      placeholder: 'CVC',
    });

    // Mount the fields into dedicated containers
    cardNumber.mount('#card-number');
    cardExpiry.mount('#card-expiry');
    cardCvc.mount('#card-cvc');

    // Add class-based focus effects: when Stripe iframe gets focus,
    // we apply a focus class to the parent .stripe-input container
    // to achieve a clean border glow. We'll listen to 'focus' and 'blur' events from Stripe.
    const numberContainer = document.querySelector('#card-number');
    const expiryContainer = document.querySelector('#card-expiry');
    const cvcContainer = document.querySelector('#card-cvc');

    function addFocusClass(containerEl) {
      if (containerEl) containerEl.classList.add('stripe-input--focus');
    }
    function removeFocusClass(containerEl) {
      if (containerEl) containerEl.classList.remove('stripe-input--focus');
    }

    cardNumber.on('focus', () => addFocusClass(numberContainer));
    cardNumber.on('blur', () => removeFocusClass(numberContainer));
    cardExpiry.on('focus', () => addFocusClass(expiryContainer));
    cardExpiry.on('blur', () => removeFocusClass(expiryContainer));
    cardCvc.on('focus', () => addFocusClass(cvcContainer));
    cardCvc.on('blur', () => removeFocusClass(cvcContainer));

    // Error container
    const errorElement = document.getElementById('card-errors');
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = '✓ Save card';

    // Helper: show inline error in friendly style
    function showError(message) {
      errorElement.innerText = message || 'Something went wrong. Please verify your card details.';
      errorElement.style.display = 'block';
      // auto-hide after 5 seconds? but better to keep visible until next input? But we keep for ux.
    }

    function hideError() {
      errorElement.innerText = '';
      errorElement.style.display = 'none';
    }

    // Listen to change events for each field to clear error when typing
    function clearErrorOnChange() {
      hideError();
    }
    cardNumber.on('change', clearErrorOnChange);
    cardExpiry.on('change', clearErrorOnChange);
    cardCvc.on('change', clearErrorOnChange);

    // Global error handler for individual field errors (like incomplete)
    cardNumber.on('change', (event) => {
      if (event.error) {
        showError(event.error.message);
      } else if (!event.empty && !event.complete) {
        hideError();
      }
    });
    cardExpiry.on('change', (event) => {
      if (event.error) showError(event.error.message);
      else if (!event.empty && !event.complete) hideError();
    });
    cardCvc.on('change', (event) => {
      if (event.error) showError(event.error.message);
      else if (!event.empty && !event.complete) hideError();
    });

    // Communicate with React Native WebView
    function postMessageToApp(payload) {
      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else {
          // For debugging in browser: console log
          console.log('[Bridge message]', payload);
        }
      } catch (err) {
        console.warn('Failed to post message', err);
      }
    }

    // Cancel handler
    const cancelLink = document.getElementById('cancel-link');
    if (cancelLink) {
      cancelLink.addEventListener('click', (e) => {
        e.preventDefault();
        postMessageToApp({ type: 'payment_cancelled' });
      });
    }

    // Submit handler: confirm setupIntent with Stripe
    const form = document.getElementById('payment-form');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        // Confirm the card setup using the client secret and card element
        const result = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardNumber,
          }
        });

        if (result.error) {
          // user-friendly error message
          let friendlyMsg = result.error.message;
          if (friendlyMsg && friendlyMsg.toLowerCase().includes('incomplete')) {
            friendlyMsg = 'Please fill in all card details correctly.';
          } else if (friendlyMsg && friendlyMsg.toLowerCase().includes('expired')) {
            friendlyMsg = 'Your card has expired. Use a different card.';
          }
          showError(friendlyMsg || 'Card validation failed. Check details and try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        const { setupIntent } = result;
        if (!setupIntent || setupIntent.status !== 'succeeded') {
          showError('Setup was not completed. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        const returnedSetupId = setupIntent.id || setupIntentId;
        // Call our backend completion endpoint
        const response = await fetch(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            t: embedT,
            setup_intent_id: returnedSetupId
          })
        });

        let data;
        try {
          data = await response.json();
        } catch (err) {
          data = { ok: false, error: 'Invalid server response' };
        }

        if (data && data.ok === true) {
          // Success: notify app and close
          postMessageToApp({ type: 'payment_success' });
        } else {
          const backendError = data && data.error ? String(data.error) : 'Card could not be saved.';
          showError(backendError);
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      } catch (networkErr) {
        console.error('network error', networkErr);
        showError('Network error. Please check your connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });

    // Additional polish: if any Stripe element is complete, we could remove error after success retry.
    // Also, ensure that button state resets properly.
    // Simulate responsive adjustments: clean and ready.
    // For perfect placeholder & typing preview: the custom elementStyle ensures that while typing the text is crisp.
    // And because we set placeholder for cardNumber, expiry, cvc — user sees clear guidance.
    // Additionally we can set a small utility to prevent double submission.
    window.addEventListener('load', () => {
      // Force focus outline consistency
      document.querySelectorAll('.stripe-input').forEach(el => {
        el.style.cursor = 'text';
      });
    });
  })();
</script>
</body>
</html>
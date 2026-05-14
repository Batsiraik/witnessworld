<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…). Beautiful Stripe Card Elements with clean UI.
 */
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/lib/stripe_card_embed_session.php';

$t = isset($_GET['t']) ? (string) $_GET['t'] : '';
if (!preg_match('/^[a-f0-9]{64}$/', $t)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid link.';
    exit;
}

$session = ww_stripe_embed_load($t);
if (!$session) {
    http_response_code(410);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'This setup link expired. Close it and open Add card again from the app.';
    exit;
}

$pk = $session['publishable_key'];
$clientSecret = $session['client_secret'];
$setiId = $session['setup_intent_id'];
$completeUrl = WW_API_BASE . '/stripe-card-embedded-complete.php';

$pkJs = json_encode($pk, JSON_THROW_ON_ERROR);
$csJs = json_encode($clientSecret, JSON_THROW_ON_ERROR);
$tJs = json_encode($t, JSON_THROW_ON_ERROR);
$setiJs = json_encode($setiId, JSON_THROW_ON_ERROR);
$completeJs = json_encode($completeUrl, JSON_THROW_ON_ERROR);

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

echo <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Add payment method</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-tap-highlight-color: transparent;
    }

    body {
      background: linear-gradient(135deg, #f5f7fa 0%, #eef2f7 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
      padding: 20px;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    .card-container {
      max-width: 520px;
      width: 100%;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 40px;
      box-shadow: 0 20px 35px -12px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02);
    }

    .form-content {
      padding: 36px 32px 40px;
    }

    h1 {
      font-size: 32px;
      font-weight: 600;
      letter-spacing: -0.5px;
      color: #1a1f2e;
      margin-bottom: 8px;
    }

    .lead {
      font-size: 15px;
      color: #6b7280;
      line-height: 1.4;
      margin-bottom: 32px;
    }

    .field-group {
      margin-bottom: 20px;
    }

    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
      letter-spacing: -0.2px;
    }

    /* Stripe field containers */
    .stripe-input {
      display: block;
      width: 100%;
      background: #ffffff;
      border: 1.5px solid #e5e7eb;
      border-radius: 16px;
      padding: 12px 16px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      min-height: 56px;
    }

    /* Stripe mounts an inner div; keep it full width so the iframe is not squeezed. */
    .stripe-input > div {
      width: 100% !important;
      min-width: 0;
    }

    .stripe-input:hover {
      border-color: #cbd5e1;
      background: #fefefe;
    }

    .stripe-input--focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.08);
    }

    /* Split row for expiry and CVC */
    .row-split {
      display: flex;
      gap: 14px;
      margin-bottom: 20px;
    }
    
    .row-split .field-group {
      flex: 1 1 0;
      min-width: 0;
      margin-bottom: 0;
    }

    /* Error message styling */
    .error-message {
      background: #fef2f2;
      border-radius: 14px;
      padding: 12px 16px;
      margin: 16px 0 12px;
      font-size: 14px;
      color: #dc2626;
      border-left: 3px solid #ef4444;
      font-weight: 500;
    }

    /* Button styling */
    .btn-primary {
      width: 100%;
      background: #1a1f2e;
      border: none;
      padding: 16px 20px;
      border-radius: 48px;
      font-weight: 600;
      font-size: 16px;
      color: white;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-top: 16px;
      font-family: inherit;
    }

    .btn-primary:hover {
      background: #2d3448;
      transform: translateY(-1px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-primary:disabled {
      background: #cbd5e1;
      cursor: not-allowed;
      transform: none;
    }

    /* Cancel link */
    .cancel-wrapper {
      text-align: center;
      margin-top: 24px;
    }
    
    .cancel-link {
      font-size: 15px;
      color: #6b7280;
      text-decoration: none;
      padding: 8px 16px;
      display: inline-block;
      transition: color 0.2s;
    }
    
    .cancel-link:hover {
      color: #374151;
    }

    /* Security badge */
    .badge-secure {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #f0f2f5;
      font-size: 12px;
      color: #9ca3af;
    }

    @media (max-width: 480px) {
      body { padding: 12px; }
      .form-content { padding: 28px 24px 32px; }
      h1 { font-size: 28px; }
    }
  </style>
</head>
<body>
<div class="card-container">
  <div class="form-content">
    <h1>Add card</h1>
    <div class="lead">
      Enter your card details to start your membership
    </div>

    <form id="payment-form" autocomplete="off">
      <div class="field-group">
        <div class="field-label">Card number</div>
        <div id="card-number" class="stripe-input"></div>
      </div>

      <div class="row-split">
        <div class="field-group">
          <div class="field-label">Expiry date</div>
          <div id="card-expiry" class="stripe-input"></div>
        </div>
        <div class="field-group">
          <div class="field-label">Security code</div>
          <div id="card-cvc" class="stripe-input"></div>
        </div>
      </div>

      <div id="card-errors" role="alert" class="error-message" style="display: none;"></div>

      <button type="submit" id="submit-btn" class="btn-primary">Save card</button>
    </form>

    <div class="cancel-wrapper">
      <a href="#" id="cancel-link" class="cancel-link">Cancel</a>
    </div>
    
    <div class="badge-secure">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9v4c0 3.87 3.13 7 7 7s7-3.13 7-7V9c0-3.87-3.13-7-7-7z" stroke="currentColor" stroke-width="1.5" fill="none"/>
        <path d="M12 11v3m0 2v.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      <span>PCI compliant · Secured by Stripe</span>
    </div>
  </div>
</div>

<script>
(function() {
    // Backend data
    let pk = {$pkJs};
    let clientSecret = {$csJs};
    let embedT = {$tJs};
    let setupIntentId = {$setiJs};
    let completeUrl = {$completeJs};
    
    if (!pk || !clientSecret) {
      const errEl = document.getElementById('card-errors');
      errEl.innerText = 'Configuration error. Please close and try again.';
      errEl.style.display = 'block';
      return;
    }

    const stripe = Stripe(pk);
    
    // Minimal styles + web-safe font — heavy weights / nested placeholder rules can look wrong inside Elements iframes (especially WebView).
    const elementStyles = {
      base: {
        color: '#1f2937',
        fontSize: '17px',
        fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
        letterSpacing: '0.02em',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#9ca3af'
        }
      },
      invalid: {
        color: '#1f2937',
        iconColor: '#64748b',
        '::placeholder': {
          color: '#9ca3af'
        }
      },
      complete: {
        color: '#059669'
      }
    };

    const elements = stripe.elements({ locale: 'auto' });
    
    // Create elements with custom placeholders
    const cardNumber = elements.create('cardNumber', { 
      style: elementStyles,
      showIcon: true,
      placeholder: '1234 5678 9012 3456'
    });
    
    const cardExpiry = elements.create('cardExpiry', { 
      style: elementStyles,
      placeholder: 'MM / YY'
    });
    
    const cardCvc = elements.create('cardCvc', { 
      style: elementStyles,
      placeholder: 'CVC'
    });
    
    // Mount the fields
    cardNumber.mount('#card-number');
    cardExpiry.mount('#card-expiry');
    cardCvc.mount('#card-cvc');

    // Focus effects
    const containers = {
      number: document.querySelector('#card-number'),
      expiry: document.querySelector('#card-expiry'),
      cvc: document.querySelector('#card-cvc')
    };

    cardNumber.on('focus', () => containers.number.classList.add('stripe-input--focus'));
    cardNumber.on('blur', () => containers.number.classList.remove('stripe-input--focus'));
    cardExpiry.on('focus', () => containers.expiry.classList.add('stripe-input--focus'));
    cardExpiry.on('blur', () => containers.expiry.classList.remove('stripe-input--focus'));
    cardCvc.on('focus', () => containers.cvc.classList.add('stripe-input--focus'));
    cardCvc.on('blur', () => containers.cvc.classList.remove('stripe-input--focus'));

    const errorElement = document.getElementById('card-errors');
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = 'Save card';

    function showError(message) {
      errorElement.innerText = message || 'Something went wrong. Please check your card details.';
      errorElement.style.display = 'block';
    }

    function hideError() {
      errorElement.innerText = '';
      errorElement.style.display = 'none';
    }

    // Clear error when user types
    cardNumber.on('change', (event) => {
      if (event.error) {
        showError(event.error.message);
      } else {
        hideError();
      }
    });
    
    cardExpiry.on('change', (event) => {
      if (event.error) {
        showError(event.error.message);
      } else {
        hideError();
      }
    });
    
    cardCvc.on('change', (event) => {
      if (event.error) {
        showError(event.error.message);
      } else {
        hideError();
      }
    });

    function postMessageToApp(payload) {
      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else {
          console.log('[Bridge]', payload);
        }
      } catch (err) {
        console.warn('Failed to post message', err);
      }
    }

    document.getElementById('cancel-link').addEventListener('click', (e) => {
      e.preventDefault();
      postMessageToApp({ type: 'payment_cancelled' });
    });

    document.getElementById('payment-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        const result = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardNumber,
          }
        });

        if (result.error) {
          showError(result.error.message || 'Card was declined. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        const { setupIntent } = result;
        if (!setupIntent || setupIntent.status !== 'succeeded') {
          showError('Setup did not complete. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        const response = await fetch(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            t: embedT, 
            setup_intent_id: setupIntent.id || setupIntentId 
          })
        });

        let data;
        try {
          data = await response.json();
        } catch (err) {
          data = { ok: false, error: 'Server error' };
        }

        if (data && data.ok === true) {
          postMessageToApp({ type: 'payment_success' });
        } else {
          showError((data && data.error) || 'Could not save card. Please try again.');
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      } catch (networkErr) {
        showError('Network error. Please check your connection.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
})();
</script>
</body>
</html>
HTML;
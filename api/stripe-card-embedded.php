<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…). Split Card Elements (number / expiry / CVC) + SetupIntent.
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
      font-family: "Helvetica Neue", Helvetica, sans-serif;
      min-height: 100vh;
      padding: 24px 16px;
      background: #f6f9fc;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }

    .wrapper {
      width: 90%;
      max-width: 640px;
      margin: 0 auto;
    }

    form {
      padding: 30px;
      margin-bottom: 20px;
      margin-left: auto;
      margin-right: auto;
      width: 100%;
      max-width: 600px;
      background: #fff;
      border-radius: 4px;
      box-shadow: 0 1px 3px 0 #e6ebf1;
      display: flex;
      flex-direction: column;
      align-items: stretch;
    }

    label {
      font-weight: 500;
      font-size: 14px;
      display: block;
      margin-bottom: 8px;
      color: #32325d;
    }

    #card-errors {
      min-height: 20px;
      padding: 8px 0 0;
      margin-top: 12px;
      color: #fa755a;
      font-size: 14px;
    }

    /* Full width — the old 70% float + max-width 400px squeezed the iframe in WebViews (compressed text, clipped first digits). */
    .form-row {
      width: 100%;
      min-width: 0;
    }

    .stripe-field-host {
      background-color: white;
      width: 100%;
      padding: 14px 16px;
      border-radius: 4px;
      border: 1px solid transparent;
      box-shadow: 0 1px 3px 0 #e6ebf1;
      -webkit-transition: box-shadow 150ms ease;
      transition: box-shadow 150ms ease;
      overflow: visible;
    }

    .stripe-field-host.is-focused {
      box-shadow: 0 1px 3px 0 #cfd7df;
    }

    .stripe-field-host.is-invalid {
      border-color: #fa755a;
    }

    .stripe-field-host .StripeElement--webkit-autofill {
      background-color: #fefde5 !important;
    }

    .stripe-row-split {
      display: flex;
      gap: 16px;
      margin-top: 16px;
      width: 100%;
      min-width: 0;
    }

    .stripe-row-split > div {
      flex: 1 1 0;
      min-width: 0;
    }

    .field-label-sub {
      font-weight: 500;
      font-size: 13px;
      display: block;
      margin-bottom: 6px;
      color: #32325d;
    }

    .btn-Stripe {
      border: none;
      border-radius: 4px;
      outline: none;
      text-decoration: none;
      color: #fff;
      background: #15a99e;
      white-space: nowrap;
      display: inline-block;
      height: 40px;
      line-height: 40px;
      padding: 0 14px;
      box-shadow: 0 4px 6px rgba(50, 50, 93, .11), 0 1px 3px rgba(0, 0, 0, .08);
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.025em;
      -webkit-transition: all 150ms ease;
      transition: all 150ms ease;
      margin-top: 20px;
      align-self: flex-start;
      cursor: pointer;
      font-family: inherit;
    }

    .btn-Stripe:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 7px 14px rgba(50, 50, 93, .10), 0 3px 6px rgba(0, 0, 0, .08);
      background-color: #11987c;
    }

    .btn-Stripe:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
    }

    .cancel-wrap {
      text-align: center;
      margin-top: 16px;
    }

    .cancel-wrap a {
      font-size: 15px;
      color: #6b7c93;
      text-decoration: none;
    }

    .cancel-wrap a:hover {
      color: #32325d;
    }

    @media (max-width: 640px) {
      form {
        padding: 20px;
      }
      .btn-Stripe {
        margin-top: 16px;
        width: 100%;
        align-self: stretch;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <form id="payment-form" autocomplete="off">
      <div class="form-row">
        <label>Credit or debit card</label>
        <div id="card-number-host" class="stripe-field-host"></div>
        <div class="stripe-row-split">
          <div>
            <span class="field-label-sub">Expiry</span>
            <div id="card-expiry-host" class="stripe-field-host"></div>
          </div>
          <div>
            <span class="field-label-sub">CVC</span>
            <div id="card-cvc-host" class="stripe-field-host"></div>
          </div>
        </div>
        <div id="card-errors" role="alert"></div>
      </div>
      <button type="submit" class="btn-Stripe" id="submit-btn">Pay Now</button>
    </form>
    <div class="cancel-wrap">
      <a href="#" id="cancel-link">Cancel</a>
    </div>
  </div>

<script>
(function() {
    var pk = {$pkJs};
    var clientSecret = {$csJs};
    var embedT = {$tJs};
    var setupIntentId = {$setiJs};
    var completeUrl = {$completeJs};

    var errorEl = document.getElementById('card-errors');
    var submitBtn = document.getElementById('submit-btn');
    var originalBtnText = 'Pay Now';

    var hostNumber = document.getElementById('card-number-host');
    var hostExpiry = document.getElementById('card-expiry-host');
    var hostCvc = document.getElementById('card-cvc-host');

    if (!pk || !clientSecret) {
      errorEl.textContent = 'Configuration error. Please close and try again.';
      submitBtn.disabled = true;
      return;
    }

    var stripe = Stripe(pk);
    var elements = stripe.elements({ locale: 'auto' });

    /* Placeholders look worse on focus in some WebViews — hide them while focused; keep typed text color stable. */
    var elementStyle = {
      base: {
        color: '#32325d',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '17px',
        '::placeholder': {
          color: '#aab7c4',
          fontSmoothing: 'antialiased'
        },
        ':focus': {
          color: '#32325d',
          '::placeholder': {
            color: 'transparent'
          }
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a',
        ':focus': {
          '::placeholder': {
            color: 'transparent'
          }
        }
      }
    };

    var cardNumber = elements.create('cardNumber', {
      style: elementStyle,
      showIcon: true,
      placeholder: '1234 5678 9012 3456'
    });
    var cardExpiry = elements.create('cardExpiry', {
      style: elementStyle,
      placeholder: 'MM / YY'
    });
    var cardCvc = elements.create('cardCvc', {
      style: elementStyle,
      placeholder: 'CVC'
    });

    cardNumber.mount('#card-number-host');
    cardExpiry.mount('#card-expiry-host');
    cardCvc.mount('#card-cvc-host');

    function wireFocus(el, host) {
      el.on('focus', function () {
        host.classList.add('is-focused');
      });
      el.on('blur', function () {
        host.classList.remove('is-focused');
      });
    }
    wireFocus(cardNumber, hostNumber);
    wireFocus(cardExpiry, hostExpiry);
    wireFocus(cardCvc, hostCvc);

    function clearFieldErrors() {
      hostNumber.classList.remove('is-invalid');
      hostExpiry.classList.remove('is-invalid');
      hostCvc.classList.remove('is-invalid');
    }

    function onFieldChange(event, type) {
      if (event.error) {
        clearFieldErrors();
        if (type === 'cardNumber') hostNumber.classList.add('is-invalid');
        if (type === 'cardExpiry') hostExpiry.classList.add('is-invalid');
        if (type === 'cardCvc') hostCvc.classList.add('is-invalid');
        errorEl.textContent = event.error.message;
      } else {
        clearFieldErrors();
        errorEl.textContent = '';
      }
    }
    cardNumber.on('change', function (e) { onFieldChange(e, 'cardNumber'); });
    cardExpiry.on('change', function (e) { onFieldChange(e, 'cardExpiry'); });
    cardCvc.on('change', function (e) { onFieldChange(e, 'cardCvc'); });

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

    document.getElementById('cancel-link').addEventListener('click', function (e) {
      e.preventDefault();
      postMessageToApp({ type: 'payment_cancelled' });
    });

    document.getElementById('payment-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      errorEl.textContent = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Processing...';

      try {
        var result = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardNumber
          }
        });

        if (result.error) {
          errorEl.textContent = result.error.message || 'Card was declined. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        var setupIntent = result.setupIntent;
        if (!setupIntent || setupIntent.status !== 'succeeded') {
          errorEl.textContent = 'Setup did not complete. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
          return;
        }

        var response = await fetch(completeUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            t: embedT,
            setup_intent_id: setupIntent.id || setupIntentId
          })
        });

        var data;
        try {
          data = await response.json();
        } catch (err) {
          data = { ok: false, error: 'Server error' };
        }

        if (data && data.ok === true) {
          postMessageToApp({ type: 'payment_success' });
        } else {
          errorEl.textContent = (data && data.error) || 'Could not save card. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      } catch (networkErr) {
        errorEl.textContent = 'Network error. Please check your connection.';
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
    });
})();
</script>
</body>
</html>
HTML;
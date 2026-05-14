<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…). Classic single Stripe Card Element + SetupIntent.
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
    }

    form::after {
      content: "";
      display: table;
      clear: both;
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
      padding: 4px 0;
      color: #fa755a;
      font-size: 14px;
      clear: both;
    }

    .form-row {
      width: 70%;
      min-width: 0;
      float: left;
    }

    #card-element {
      background-color: white;
      width: 100%;
      max-width: 400px;
      min-height: 40px;
      padding: 10px 12px;
      border-radius: 4px;
      border: 1px solid transparent;
      box-shadow: 0 1px 3px 0 #e6ebf1;
      -webkit-transition: box-shadow 150ms ease;
      transition: box-shadow 150ms ease;
    }

    #card-element > div {
      width: 100% !important;
      min-width: 0;
    }

    #card-element.is-focused {
      box-shadow: 0 1px 3px 0 #cfd7df;
    }

    #card-element.is-invalid {
      border-color: #fa755a;
    }

    #card-element .StripeElement--webkit-autofill {
      background-color: #fefde5 !important;
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
      float: left;
      margin-left: 12px;
      margin-top: 28px;
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
      .form-row {
        width: 100%;
        float: none;
        margin-bottom: 8px;
      }
      .btn-Stripe {
        float: none;
        margin: 16px 0 0;
        width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <form id="payment-form" autocomplete="off">
      <div class="form-row">
        <label for="card-element">Credit or debit card</label>
        <div id="card-element"></div>
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
    var cardHost = document.getElementById('card-element');
    var submitBtn = document.getElementById('submit-btn');
    var originalBtnText = 'Pay Now';

    if (!pk || !clientSecret) {
      errorEl.textContent = 'Configuration error. Please close and try again.';
      submitBtn.disabled = true;
      return;
    }

    var stripe = Stripe(pk);
    var elements = stripe.elements({ locale: 'auto' });

    var style = {
      base: {
        color: '#32325d',
        lineHeight: '18px',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };

    var card = elements.create('card', { style: style });
    card.mount('#card-element');

    card.on('focus', function () {
      cardHost.classList.add('is-focused');
    });
    card.on('blur', function () {
      cardHost.classList.remove('is-focused');
    });

    card.on('change', function (event) {
      if (event.error) {
        cardHost.classList.add('is-invalid');
        errorEl.textContent = event.error.message;
      } else {
        cardHost.classList.remove('is-invalid');
        errorEl.textContent = '';
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
            card: card
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
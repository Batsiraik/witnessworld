<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…).
 * Shell + Stripe Element wiring aligned with PassDrive’s minimal page (no extra framework; only Stripe.js + this file).
 * Payment: SetupIntent + confirmCardSetup + complete endpoint (WitnessWorld; not PassDrive’s createToken + Charge).
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
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Save payment method</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #0f172a;
      color: #e2e8f0;
      min-height: 100vh;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    .card {
      background: #1e293b;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      margin: 0 auto;
      border: 1px solid #334155;
    }
    h1 { font-size: 20px; margin: 0 0 8px; color: #fff; font-weight: 700; }
    .subtitle { font-size: 14px; color: #94a3b8; margin-bottom: 16px; line-height: 1.45; }
    label { display: block; font-size: 14px; color: #94a3b8; margin-bottom: 6px; }
    .card-field {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #475569;
      background: #0f172a;
      margin-bottom: 12px;
    }
    .card-fields-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .card-fields-row .card-field { flex: 1; margin-bottom: 0; }
    #card-errors {
      color: #f87171;
      font-size: 14px;
      margin-bottom: 12px;
      min-height: 20px;
    }
    .autofill-hint {
      font-size: 12px;
      color: #94a3b8;
      margin: -4px 0 12px;
      padding: 8px 10px;
      background: rgba(100, 116, 139, 0.2);
      border-radius: 8px;
    }
    .btn {
      width: 100%;
      padding: 16px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .cancel-wrap { text-align: center; margin-top: 16px; }
    .cancel-wrap a { font-size: 15px; color: #94a3b8; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Save payment method</h1>
    <p class="subtitle">Secured by Stripe — same layout as PassDrive; WitnessWorld saves the card for billing.</p>
    <form id="payment-form" autocomplete="off">
      <label for="card-number">Card details</label>
      <div id="card-number" class="card-field"></div>
      <div class="card-fields-row">
        <div id="card-expiry" class="card-field"></div>
        <div id="card-cvc" class="card-field"></div>
      </div>
      <p class="autofill-hint">Expiry shows wrong? Clear it and type MM/YY manually (e.g. 12/28).</p>
      <div id="card-errors"></div>
      <button type="submit" class="btn btn-primary" id="submit-btn">Save card</button>
    </form>
    <div class="cancel-wrap"><a href="#" id="cancel-link">Cancel</a></div>
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
    var originalBtnText = 'Save card';

    if (!pk || !clientSecret) {
      errorEl.textContent = 'Configuration error. Please close and try again.';
      submitBtn.disabled = true;
      return;
    }

    var stripe = Stripe(pk);
    var elements = stripe.elements();

    var style = { base: { color: '#fff', fontSize: '16px' } };
    var cardNumber = elements.create('cardNumber', { style: style });
    var cardExpiry = elements.create('cardExpiry', { style: style, placeholder: 'MM/YY' });
    var cardCvc = elements.create('cardCvc', { style: style });

    cardNumber.mount('#card-number');
    cardExpiry.mount('#card-expiry');
    cardCvc.mount('#card-cvc');

    function onCardChange(e) {
      errorEl.textContent = e.error ? e.error.message : '';
    }
    cardNumber.on('change', onCardChange);
    cardExpiry.on('change', onCardChange);
    cardCvc.on('change', onCardChange);

    function postMessageToApp(payload) {
      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } else {
          console.log('[Bridge]', payload);
        }
      } catch (err) {}
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
          payment_method: { card: cardNumber }
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
        try { data = await response.json(); } catch (err) { data = { ok: false, error: 'Server error' }; }

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

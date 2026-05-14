<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…). UI matches PassDrive payment_embedded (dark card + .card-field + Stripe style).
 * Witness World: no discount; SetupIntent + postMessage (not createToken / charge).
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Add card</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0f172a; color: #e2e8f0; min-height: 100vh; -webkit-text-size-adjust: 100%; }
    .card { background: #1e293b; border-radius: 16px; padding: 24px; max-width: 400px; margin: 0 auto; border: 1px solid #334155; }
    h1 { font-size: 20px; margin: 0 0 8px; color: #fff; }
    .price { font-size: 18px; color: #38bdf8; font-weight: 600; margin-bottom: 16px; }
    label { display: block; font-size: 14px; color: #94a3b8; margin-bottom: 6px; }
    input[type="text"] { width: 100%; padding: 14px; border-radius: 12px; border: 1px solid #475569; background: #0f172a; color: #fff; font-size: 16px; margin-bottom: 12px; }
    .card-field { padding: 14px; border-radius: 12px; border: 1px solid #475569; background: #0f172a; margin-bottom: 12px; }
    .card-field > div { width: 100%; }
    .card-fields-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .card-fields-row .card-field { flex: 1; margin-bottom: 0; min-width: 0; }
    #card-errors { color: #f87171; font-size: 14px; margin-bottom: 12px; min-height: 20px; }
    .btn { width: 100%; padding: 16px; border-radius: 12px; font-size: 16px; font-weight: 600; border: none; cursor: pointer; }
    .btn-primary { background: linear-gradient(90deg, #3b82f6, #8b5cf6); color: #fff; }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .discount-row { display: flex; gap: 8px; margin-bottom: 16px; }
    .discount-row input { flex: 1; margin-bottom: 0; }
    .btn-apply { padding: 14px 20px; background: #475569; color: #fff; border-radius: 12px; border: none; font-weight: 600; cursor: pointer; }
    .success { color: #4ade80; font-size: 14px; margin-bottom: 8px; }
    .error { color: #f87171; font-size: 14px; margin-bottom: 8px; }
    .autofill-hint { font-size: 12px; color: #94a3b8; margin: -4px 0 12px; padding: 8px 10px; background: rgba(100,116,139,0.2); border-radius: 8px; line-height: 1.4; }
    a.cancel { display: block; text-align: center; margin-top: 16px; color: #94a3b8; font-size: 15px; font-weight: 600; text-decoration: none; }
    a.cancel:active { color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Pay with Master/Visa Card</h1>
    <p class="price">Save card for membership billing · processed by Stripe</p>

    <form id="payment-form" autocomplete="off">
      <label>Card details</label>
      <div id="card-number" class="card-field"></div>
      <div class="card-fields-row">
        <div id="card-expiry" class="card-field"></div>
        <div id="card-cvc" class="card-field"></div>
      </div>
      <p class="autofill-hint">Expiry shows wrong? Clear it and type MM/YY manually (e.g. 12/28).</p>
      <div id="card-errors"></div>
      <button type="submit" class="btn btn-primary" id="submit-btn">Save card</button>
    </form>
    <a href="#" class="cancel" id="cancel-link">Cancel</a>
  </div>

  <script>
(function () {
  var pk = {$pkJs};
  var clientSecret = {$csJs};
  var embedT = {$tJs};
  var setupIntentId = {$setiJs};
  var completeUrl = {$completeJs};
  var stripe = Stripe(pk);
  var elements = stripe.elements();
  var style = { base: { color: '#fff', fontSize: '16px' } };
  var cardNumber = elements.create('cardNumber', { style: style });
  var cardExpiry = elements.create('cardExpiry', { style: style, placeholder: 'MM/YY' });
  var cardCvc = elements.create('cardCvc', { style: style });
  cardNumber.mount('#card-number');
  cardExpiry.mount('#card-expiry');
  cardCvc.mount('#card-cvc');

  var errEl = document.getElementById('card-errors');
  var btn = document.getElementById('submit-btn');
  var submitLabel = 'Save card';

  function onCardChange(e) {
    errEl.textContent = e.error ? e.error.message : '';
  }
  cardNumber.on('change', onCardChange);
  cardExpiry.on('change', onCardChange);
  cardCvc.on('change', onCardChange);

  function post(obj) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch (e) {}
  }

  document.getElementById('cancel-link').addEventListener('click', function (e) {
    e.preventDefault();
    post({ type: 'payment_cancelled' });
  });

  document.getElementById('payment-form').addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Processing...';
    stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardNumber } }).then(function (result) {
      if (result.error) {
        errEl.textContent = result.error.message || 'Card was declined.';
        btn.disabled = false;
        btn.textContent = submitLabel;
        return;
      }
      var si = result.setupIntent;
      if (!si || si.status !== 'succeeded') {
        errEl.textContent = 'Setup did not complete. Try again.';
        btn.disabled = false;
        btn.textContent = submitLabel;
        return;
      }
      var sid = si.id || setupIntentId;
      fetch(completeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: embedT, setup_intent_id: sid })
      }).then(function (res) { return res.json().catch(function () { return ({}); }); }).then(function (data) {
        if (data && data.ok === true) {
          post({ type: 'payment_success' });
        } else {
          errEl.textContent = (data && data.error) ? String(data.error) : 'Could not save card.';
          btn.disabled = false;
          btn.textContent = submitLabel;
        }
      }).catch(function () {
        errEl.textContent = 'Network error. Check connection and try again.';
        btn.disabled = false;
        btn.textContent = submitLabel;
      });
    });
  });
})();
  </script>
</body>
</html>
HTML;

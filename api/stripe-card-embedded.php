<?php

declare(strict_types=1);

/**
 * In-app card setup — WebView (?t=…).
 * Stripe Card Elements with default appearance (no style / placeholder options).
 * Witness World: SetupIntent + postMessage.
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
    /* Page chrome only — no styling of Stripe field iframes (Stripe defaults). */
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; background: #fff; color: #1f2937; }
    main { max-width: 28rem; margin: 0 auto; }
    h1 { font-size: 1.25rem; margin: 0 0 0.5rem; font-weight: 600; }
    p.lead { margin: 0 0 1rem; font-size: 0.9rem; color: #4b5563; }
    .split { display: flex; gap: 12px; }
    .split > div { flex: 1; min-width: 0; }
    #card-number { margin-bottom: 12px; }
    .split { margin-bottom: 12px; }
    #card-errors { margin: 12px 0; min-height: 1.25em; color: #b91c1c; font-size: 0.875rem; }
    button[type="submit"] { margin-top: 4px; }
    a.cancel { display: inline-block; margin-top: 16px; font-size: 0.9rem; color: #4b5563; }
  </style>
</head>
<body>
  <main>
    <h1>Add payment method</h1>
    <p class="lead">Your card is saved for membership billing. Fields below are shown by Stripe with default styling.</p>
    <form id="payment-form" autocomplete="off">
      <div id="card-number"></div>
      <div class="split">
        <div id="card-expiry"></div>
        <div id="card-cvc"></div>
      </div>
      <div id="card-errors" role="alert"></div>
      <button type="submit" id="submit-btn">Save card</button>
    </form>
    <a href="#" class="cancel" id="cancel-link">Cancel</a>
  </main>

  <script>
(function () {
  var pk = {$pkJs};
  var clientSecret = {$csJs};
  var embedT = {$tJs};
  var setupIntentId = {$setiJs};
  var completeUrl = {$completeJs};
  var stripe = Stripe(pk);
  var elements = stripe.elements();
  var cardNumber = elements.create('cardNumber');
  var cardExpiry = elements.create('cardExpiry');
  var cardCvc = elements.create('cardCvc');
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

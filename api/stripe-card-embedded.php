<?php

declare(strict_types=1);

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
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>Add card</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 16px; background: #f6f7fb; color: #0b1220; }
    h1 { font-size: 1.1rem; margin: 0 0 12px; }
    #card-element { background: #fff; padding: 12px 14px; border-radius: 10px; border: 1px solid #d7dbe8; margin-bottom: 14px; }
    #card-errors { color: #b42318; font-size: 0.875rem; min-height: 1.25em; margin-bottom: 10px; }
    button { width: 100%; padding: 14px 16px; border: 0; border-radius: 10px; background: #3b5bdb; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .cancel { display: block; text-align: center; margin-top: 14px; color: #5c6478; font-size: 0.9rem; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Secure card details</h1>
  <p style="font-size:0.9rem;color:#5c6478;margin:0 0 14px;">Processed by Stripe. Your card is saved for membership billing only.</p>
  <form id="payment-form">
    <div id="card-element"></div>
    <div id="card-errors" role="alert"></div>
    <button type="submit" id="submit">Save card</button>
  </form>
  <a href="#" class="cancel" id="cancel-link">Cancel</a>
  <script>
(function () {
  var pk = {$pkJs};
  var clientSecret = {$csJs};
  var embedT = {$tJs};
  var setupIntentId = {$setiJs};
  var completeUrl = {$completeJs};
  var stripe = Stripe(pk);
  var elements = stripe.elements();
  var card = elements.create('card', { hidePostalCode: true });
  card.mount('#card-element');
  var form = document.getElementById('payment-form');
  var submitBtn = document.getElementById('submit');
  var errEl = document.getElementById('card-errors');

  function post(obj) {
    try {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(obj));
      }
    } catch (e) {}
  }

  function showErr(msg) {
    errEl.textContent = msg || '';
  }

  document.getElementById('cancel-link').addEventListener('click', function (e) {
    e.preventDefault();
    post({ type: 'payment_cancelled' });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errEl.textContent = '';
    submitBtn.disabled = true;
    stripe.confirmCardSetup(clientSecret, { payment_method: { card: card } }).then(function (result) {
      if (result.error) {
        showErr(result.error.message || 'Card was declined.');
        submitBtn.disabled = false;
        return;
      }
      var si = result.setupIntent;
      if (!si || si.status !== 'succeeded') {
        showErr('Setup did not complete. Try again.');
        submitBtn.disabled = false;
        return;
      }
      var sid = si.id || setupIntentId;
      fetch(completeUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ t: embedT, setup_intent_id: sid })
      }).then(function (res) { return res.json().catch(function () { return {}; }); }).then(function (data) {
        if (data && data.ok === true) {
          post({ type: 'payment_success' });
        } else {
          var msg = (data && data.error) ? String(data.error) : 'Server could not save card.';
          showErr(msg);
          submitBtn.disabled = false;
        }
      }).catch(function () {
        showErr('Network error. Check connection and try again.');
        submitBtn.disabled = false;
      });
    });
  });
})();
  </script>
</body>
</html>
HTML;

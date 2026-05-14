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
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>Add card</title>
  <script src="https://js.stripe.com/v3/"></script>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px 16px 32px;
      background: #e8ecf4;
      color: #0f172a;
      min-height: 100vh;
      -webkit-text-size-adjust: 100%;
    }
    .panel {
      background: #fff;
      border-radius: 16px;
      padding: 24px;
      max-width: 400px;
      margin: 0 auto;
      border: 1px solid #e2e8f0;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
    }
    h1 { font-size: 20px; margin: 0 0 8px; font-weight: 700; color: #0f172a; }
    .subtitle { font-size: 14px; color: #64748b; margin: 0 0 20px; line-height: 1.45; }
    label.block { display: block; font-size: 14px; color: #64748b; margin-bottom: 8px; font-weight: 600; }
    .card-field {
      padding: 14px;
      border-radius: 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      margin-bottom: 12px;
    }
    .card-field:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.18);
      background: #fff;
    }
    .card-field > div { width: 100%; }
    .card-fields-row { display: flex; gap: 12px; margin-bottom: 12px; }
    .card-fields-row .card-field { flex: 1; margin-bottom: 0; min-width: 0; }
    .autofill-hint {
      font-size: 12px;
      color: #64748b;
      margin: -4px 0 12px;
      padding: 8px 10px;
      background: #f1f5f9;
      border-radius: 8px;
      line-height: 1.4;
    }
    #card-errors { color: #dc2626; font-size: 14px; margin-bottom: 12px; min-height: 20px; font-weight: 600; }
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
      background: linear-gradient(90deg, #3b82f6, #6366f1);
      color: #fff;
    }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .cancel {
      display: block;
      text-align: center;
      margin-top: 16px;
      color: #64748b;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="panel">
    <h1>Add payment method</h1>
    <p class="subtitle">Processed by Stripe. Your card is saved for membership billing only.</p>
    <form id="payment-form" autocomplete="off">
      <label class="block" for="card-number">Card details</label>
      <div id="card-number" class="card-field"></div>
      <div class="card-fields-row">
        <div id="card-expiry" class="card-field"></div>
        <div id="card-cvc" class="card-field"></div>
      </div>
      <p class="autofill-hint">Expiry looks wrong? Clear the field and type MM/YY yourself (e.g. 12/28).</p>
      <div id="card-errors" role="alert"></div>
      <button type="submit" class="btn btn-primary" id="submit">Save card</button>
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
  var fieldStyle = {
    base: {
      color: '#0f172a',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '16px',
      lineHeight: '24px',
      fontWeight: '500',
      '::placeholder': {
        color: '#94a3b8',
        fontSize: '16px',
        fontWeight: '400'
      }
    },
    invalid: {
      color: '#0f172a'
    }
  };
  var cardNumber = elements.create('cardNumber', {
    style: fieldStyle,
    placeholder: '1234 1234 1234 1234'
  });
  var cardExpiry = elements.create('cardExpiry', {
    style: fieldStyle,
    placeholder: 'MM/YY'
  });
  var cardCvc = elements.create('cardCvc', {
    style: fieldStyle,
    placeholder: 'CVC'
  });
  cardNumber.mount('#card-number');
  cardExpiry.mount('#card-expiry');
  cardCvc.mount('#card-cvc');
  var form = document.getElementById('payment-form');
  var submitBtn = document.getElementById('submit');
  var errEl = document.getElementById('card-errors');
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
    submitBtn.textContent = 'Processing…';
    stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardNumber } }).then(function (result) {
      if (result.error) {
        showErr(result.error.message || 'Card was declined.');
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
        return;
      }
      var si = result.setupIntent;
      if (!si || si.status !== 'succeeded') {
        showErr('Setup did not complete. Try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
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
          submitBtn.textContent = submitLabel;
        }
      }).catch(function () {
        showErr('Network error. Check connection and try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      });
    });
  });
})();
  </script>
</body>
</html>
HTML;

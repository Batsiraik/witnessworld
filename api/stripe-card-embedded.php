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
    body { font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 16px; background: #f0f2f7; color: #0b1220; -webkit-text-size-adjust: 100%; }
    h1 { font-size: 1.15rem; margin: 0 0 10px; font-weight: 700; }
    .field { margin-bottom: 14px; }
    .field label { display: block; font-size: 0.8rem; font-weight: 700; color: #1a2332; margin-bottom: 6px; letter-spacing: 0.02em; }
    .stripe-box {
      background: #fff;
      padding: 0 14px;
      border-radius: 14px;
      border: 1.5px solid #c8cfdd;
      height: 56px;
      display: flex;
      align-items: center;
    }

    .stripe-box > div {
      width: 100%;
    }

    .stripe-box iframe {
      height: 28px !important;
    }

    .stripe-box:focus-within {
      border-color: #3b5bdb;
      box-shadow: 0 0 0 4px rgba(59, 91, 219, 0.16);
    }
    .row2 { display: flex; gap: 12px; }
    .row2 .field { flex: 1; min-width: 0; margin-bottom: 14px; }
    #card-errors { color: #b42318; font-size: 0.9rem; min-height: 1.35em; margin: 0 0 12px; font-weight: 600; }
    button { width: 100%; padding: 15px 16px; border: 0; border-radius: 10px; background: #3b5bdb; color: #fff; font-weight: 700; font-size: 1.05rem; cursor: pointer; }
    button:disabled { opacity: 0.55; cursor: not-allowed; }
    .cancel { display: block; text-align: center; margin-top: 14px; color: #3d4a5c; font-size: 0.95rem; font-weight: 600; text-decoration: none; }
  </style>
</head>
<body>
  <h1>Secure card details</h1>
  <p style="font-size:0.92rem;color:#3d4a5c;margin:0 0 18px;line-height:1.45;">Processed by Stripe. Your card is saved for membership billing only.</p>
  <form id="payment-form">
    <div class="field">
      <label for="card-number-element">Card number</label>
      <div id="card-number-element" class="stripe-box"></div>
    </div>
    <div class="row2">
      <div class="field">
        <label for="card-expiry-element">Expiry</label>
        <div id="card-expiry-element" class="stripe-box"></div>
      </div>
      <div class="field">
        <label for="card-cvc-element">CVC</label>
        <div id="card-cvc-element" class="stripe-box"></div>
      </div>
    </div>
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
  var fieldStyle = {
    base: {
      color: '#111827',
      fontFamily: 'Arial, sans-serif',
      fontSize: '18px',
      lineHeight: '28px',
      fontWeight: '500',
      letterSpacing: '0px',
      '::placeholder': {
        color: '#9ca3af',
        fontSize: '17px',
        fontWeight: '400'
      }
    },
    invalid: {
      color: '#111827'
    }
  };
  var cardNumber = elements.create('cardNumber', {
    style: fieldStyle,
    placeholder: 'Card number'
  });

  var cardExpiry = elements.create('cardExpiry', {
    style: fieldStyle,
    placeholder: 'MM / YY'
  });

  var cardCvc = elements.create('cardCvc', {
    style: fieldStyle,
    placeholder: 'CVC'
  });
  cardNumber.mount('#card-number-element');
  cardExpiry.mount('#card-expiry-element');
  cardCvc.mount('#card-cvc-element');
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
    stripe.confirmCardSetup(clientSecret, { payment_method: { card: cardNumber } }).then(function (result) {
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

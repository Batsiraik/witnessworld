<?php

declare(strict_types=1);

/**
 * UI-only “add card” demo for client walkthroughs. No Stripe.js, no charges, no card stored.
 * Only reachable when WW_FAKE_STRIPE_CARD is true (see api/config.php + config.local.php).
 */
require_once __DIR__ . '/config.php';

if (!defined('WW_FAKE_STRIPE_CARD') || !WW_FAKE_STRIPE_CARD) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found.';
    exit;
}

header('Content-Type: text/html; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');

echo <<<'HTML'
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Add payment method (demo)</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html { color-scheme: light; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif;
      min-height: 100vh;
      padding: 20px 16px 28px;
      background: linear-gradient(180deg, #f1f5f9 0%, #e8eef5 100%);
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
    }
    .demo-pill {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #b45309;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      padding: 4px 10px;
      border-radius: 999px;
      margin-bottom: 14px;
    }
    .wrapper { width: 100%; max-width: 420px; margin: 0 auto; }
    form {
      background: #fff;
      border-radius: 12px;
      padding: 22px 20px 24px;
      box-shadow: 0 4px 24px rgba(15, 23, 42, 0.08);
      border: 1px solid rgba(148, 163, 184, 0.35);
    }
    .form-title {
      font-size: 17px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .form-hint { font-size: 13px; color: #64748b; margin-bottom: 18px; line-height: 1.4; }
    label {
      font-weight: 600;
      font-size: 13px;
      color: #334155;
      display: block;
      margin-bottom: 6px;
    }
    .field {
      width: 100%;
      font-size: 17px;
      font-weight: 500;
      line-height: 1.3;
      letter-spacing: 0.02em;
      color: #0f172a;
      padding: 14px 16px;
      border-radius: 8px;
      border: 1px solid #cbd5e1;
      background: #fff;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
      font-variant-numeric: tabular-nums;
    }
    .field:focus {
      border-color: #64748b;
      box-shadow: 0 0 0 3px rgba(100, 116, 139, 0.2);
    }
    .field::placeholder { color: #94a3b8; font-weight: 400; }
    .row-split {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      margin-top: 14px;
    }
    @media (max-width: 360px) {
      .row-split { grid-template-columns: 1fr; }
    }
    .sub-label { margin-top: 0; }
    .err {
      color: #dc2626;
      font-size: 13px;
      margin-top: 10px;
      min-height: 0;
      display: none;
    }
    .err.show { display: block; }
    .btn {
      width: 100%;
      margin-top: 18px;
      border: none;
      border-radius: 8px;
      height: 48px;
      font-size: 16px;
      font-weight: 600;
      color: #fff;
      background: #15a99e;
      cursor: pointer;
      box-shadow: 0 4px 6px rgba(50, 50, 93, 0.12);
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .cancel-wrap { text-align: center; margin-top: 18px; }
    .cancel-wrap a { font-size: 15px; color: #64748b; text-decoration: none; font-weight: 500; }
  </style>
</head>
<body>
  <div class="wrapper">
    <span class="demo-pill">Demo — not Stripe</span>
    <form id="demo-form" autocomplete="off" novalidate>
      <div class="form-title">Add payment method</div>
      <p class="form-hint">Preview only. Nothing is charged and no card is saved.</p>

      <label for="cc-num">Credit or debit card</label>
      <input id="cc-num" class="field" type="text" inputmode="numeric" maxlength="19" spellcheck="false" value="4242 4242 4242 4242" placeholder="1234 5678 9012 3456" aria-label="Card number">

      <div class="row-split">
        <div>
          <label class="sub-label" for="cc-exp">Expiry</label>
          <input id="cc-exp" class="field" type="text" inputmode="numeric" maxlength="7" spellcheck="false" value="12 / 28" placeholder="MM / YY" aria-label="Expiry">
        </div>
        <div>
          <label class="sub-label" for="cc-cvc">CVC</label>
          <input id="cc-cvc" class="field" type="text" inputmode="numeric" maxlength="4" spellcheck="false" value="123" placeholder="CVC" aria-label="CVC">
        </div>
      </div>

      <div id="demo-err" class="err" role="alert"></div>
      <button type="submit" class="btn" id="demo-submit">Pay Now</button>
    </form>
    <div class="cancel-wrap"><a href="#" id="demo-cancel">Cancel</a></div>
  </div>
<script>
(function () {
  var num = document.getElementById('cc-num');
  var exp = document.getElementById('cc-exp');
  var cvc = document.getElementById('cc-cvc');
  var err = document.getElementById('demo-err');
  var btn = document.getElementById('demo-submit');

  function formatPan(v) {
    var d = v.replace(/\D/g, '').slice(0, 16);
    var p = [];
    for (var i = 0; i < d.length; i += 4) p.push(d.slice(i, i + 4));
    return p.join(' ');
  }

  function caretAfterFormatPan(prev, next, caret) {
    var digitsBefore = prev.slice(0, caret).replace(/\D/g, '').length;
    if (digitsBefore <= 0) return 0;
    var seen = 0;
    for (var i = 0; i < next.length; i++) {
      if (/\d/.test(next[i])) {
        seen++;
        if (seen >= digitsBefore) return i + 1;
      }
    }
    return next.length;
  }

  num.addEventListener('input', function () {
    var prev = num.value;
    var c = num.selectionStart;
    var next = formatPan(prev);
    num.value = next;
    var np = caretAfterFormatPan(prev, next, c);
    requestAnimationFrame(function () {
      try { num.setSelectionRange(np, np); } catch (e1) {}
    });
  });

  function formatExp(v) {
    var d = v.replace(/\D/g, '').slice(0, 4);
    if (d.length <= 2) return d;
    return d.slice(0, 2) + ' / ' + d.slice(2);
  }

  exp.addEventListener('input', function () {
    exp.value = formatExp(exp.value);
  });

  cvc.addEventListener('input', function () {
    cvc.value = cvc.value.replace(/\D/g, '').slice(0, 4);
  });

  function showErr(msg) {
    err.textContent = msg;
    err.classList.add('show');
  }
  function hideErr() {
    err.textContent = '';
    err.classList.remove('show');
  }

  function post(msg) {
    try {
      if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
        window.ReactNativeWebView.postMessage(JSON.stringify(msg));
      } else {
        console.log('[Demo]', msg);
      }
    } catch (e) {}
  }

  document.getElementById('demo-cancel').addEventListener('click', function (e) {
    e.preventDefault();
    post({ type: 'payment_cancelled' });
  });

  document.getElementById('demo-form').addEventListener('submit', function (e) {
    e.preventDefault();
    hideErr();
    var digits = num.value.replace(/\D/g, '');
    if (digits.length < 16) {
      showErr('Enter a 16-digit card number.');
      return;
    }
    var ed = exp.value.replace(/\D/g, '');
    if (ed.length < 4) {
      showErr('Enter a valid expiry (MMYY).');
      return;
    }
    if (cvc.value.replace(/\D/g, '').length < 3) {
      showErr('Enter a CVC.');
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Processing…';
    setTimeout(function () {
      post({ type: 'payment_success' });
    }, 650);
  });
})();
</script>
</body>
</html>
HTML;

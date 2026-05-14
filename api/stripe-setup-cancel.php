<?php

declare(strict_types=1);

header('Content-Type: text/html; charset=utf-8');
echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cancelled</title></head><body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5">';
echo '<h1 style="font-size:1.25rem">Card setup cancelled</h1>';
echo '<p>No changes were made. You can close this window and return to the app.</p>';
try {
    $p = json_encode(['ww' => 'stripe_setup', 'ok' => false], JSON_UNESCAPED_UNICODE);
    if ($p !== false) {
        echo '<script>(function(){var p=' . $p . ';try{if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(JSON.stringify(p));}}catch(e){}})();</script>';
    }
} catch (\Throwable) {
    /* ignore */
}
echo '</body></html>';

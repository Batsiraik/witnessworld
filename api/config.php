<?php

declare(strict_types=1);

/**
 * Public site base (emails, absolute links). Local: http://localhost/witnessworld
 */
define('WW_PUBLIC_BASE', 'https://witnessworldconnect.com');

/** API lives under WW_PUBLIC_BASE . '/api/' */
define('WW_API_BASE', WW_PUBLIC_BASE . '/api');

/**
 * Absolute URL to the logo image in HTML emails (OTP, etc.). Must be a public HTTPS URL (mail clients cannot load localhost).
 */
define('WW_EMAIL_LOGO_URL', 'https://witnessworldconnect.com/logo_ww.jpeg');
// define('WW_EMAIL_LOGO_URL', WW_PUBLIC_BASE . '/assets/email-logo.jpg');
// define('WW_EMAIL_LOGO_URL', ''); // text “W” mark only

/** Session token lifetime for mobile app (days). Users stay signed in until expiry or explicit logout. */
define('WW_TOKEN_DAYS', 365);

/**
 * Optional local/private API config.
 *
 * Put server-only secrets here (for example WW_STRIPE_SECRET_KEY) and never commit it:
 * api/config.local.php
 *
 * Optional: define('WW_API_DEBUG', true); in config.local.php for extra API error detail (never leave on in production).
 */
$wwLocalConfig = __DIR__ . '/config.local.php';
if (is_file($wwLocalConfig)) {
    require_once $wwLocalConfig;
}

if (!defined('WW_API_DEBUG')) {
    define('WW_API_DEBUG', false);
}

/**
 * Client demo only: when true, “Add card” opens a static fake form (no Stripe, no card stored).
 * Set in `config.local.php`: define('WW_FAKE_STRIPE_CARD', true); — turn off after the demo.
 */
if (!defined('WW_FAKE_STRIPE_CARD')) {
    define('WW_FAKE_STRIPE_CARD', false);
}

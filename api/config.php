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

/**
 * When true, OTP codes may be included in JSON responses for local testing only.
 * Set to false before production deploy.
 */
define('WW_API_DEBUG', false);

/** Session token lifetime for mobile app (days). Users stay signed in until expiry or explicit logout. */
define('WW_TOKEN_DAYS', 365);

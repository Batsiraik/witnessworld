<?php

declare(strict_types=1);

/**
 * Copy this file to api/config.local.php on each environment.
 * Do not commit api/config.local.php.
 */

define('WW_STRIPE_SECRET_KEY', 'sk_test_replace_me');

/** Optional; if unset, publishable key is read from DB settings `stripe_publishable_key` (admin). Required for in-app card entry. */
// define('WW_STRIPE_PUBLISHABLE_KEY', 'pk_test_replace_me');

/** Optional: block api/stripe-demo-attach-test-card.php even when using sk_test_ (rare). */
// define('WW_STRIPE_DEMO_DISABLE', true);

/** Temporary: return Stripe error text in JSON from stripe-demo-attach-test-card.php (remove after debugging). */
// define('WW_API_DEBUG', true);

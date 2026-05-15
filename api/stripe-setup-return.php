<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';
require_once dirname(__DIR__) . '/admin/includes/conn.php';
require_once __DIR__ . '/lib/stripe_checkout_setup.php';

if (!defined('WW_STRIPE_SECRET_KEY')) {
    http_response_code(503);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Billing is not configured.';
    exit;
}

$sessionId = isset($_GET['session_id']) ? trim((string) $_GET['session_id']) : '';
if ($sessionId === '' || !preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid session.';
    exit;
}

$sk = trim((string) WW_STRIPE_SECRET_KEY);

try {
    $stripe = new \Stripe\StripeClient($sk);
    $session = $stripe->checkout->sessions->retrieve(
        $sessionId,
        ['expand' => ['setup_intent']]
    );
} catch (\Throwable) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Could not verify your session.';
    exit;
}

if (($session->mode ?? '') !== 'setup') {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Invalid checkout type.';
    exit;
}

if (($session->status ?? '') !== 'complete') {
    header('Content-Type: text/html; charset=utf-8');
    echo '<!DOCTYPE html><html><body><p>This checkout is not complete yet. You can close this tab.</p></body></html>';
    exit;
}

$userId = (int) ($session->client_reference_id ?? 0);
if ($userId < 1) {
    http_response_code(400);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Missing account reference.';
    exit;
}

$customerId = is_string($session->customer) ? $session->customer : (string) ($session->customer->id ?? '');
$setupIntent = $session->setup_intent;
if (is_string($setupIntent)) {
    $setupIntent = $stripe->setupIntents->retrieve($setupIntent);
}
$pmRaw = $setupIntent->payment_method ?? null;
$pmId = is_string($pmRaw) ? $pmRaw : (string) ($pmRaw->id ?? '');

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT id, stripe_customer_id FROM users WHERE id = ? LIMIT 1');
$st->execute([$userId]);
$row = $st->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Account not found.';
    exit;
}

$dbCust = trim((string) ($row['stripe_customer_id'] ?? ''));
if ($dbCust !== '' && $customerId !== '' && $dbCust !== $customerId) {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Customer mismatch.';
    exit;
}

$custToStore = $customerId !== '' ? $customerId : ($dbCust !== '' ? $dbCust : null);

require_once __DIR__ . '/lib/stripe_payment_method_sync.php';
ww_stripe_sync_user_payment_method($pdo, $stripe, $userId, $custToStore, $pmId);

ww_stripe_redirect_to_app('stripe-setup/success');

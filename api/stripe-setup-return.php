<?php

declare(strict_types=1);

require_once dirname(__DIR__) . '/vendor/autoload.php';
require_once __DIR__ . '/config.php';
require_once dirname(__DIR__) . '/admin/includes/conn.php';

header('Content-Type: text/html; charset=utf-8');

if (!defined('WW_STRIPE_SECRET_KEY')) {
    http_response_code(503);
    echo '<!DOCTYPE html><html><body><p>Billing is not configured.</p></body></html>';
    exit;
}

$sessionId = isset($_GET['session_id']) ? trim((string) $_GET['session_id']) : '';
if ($sessionId === '' || !preg_match('/^cs_[A-Za-z0-9_]+$/', $sessionId)) {
    http_response_code(400);
    echo '<!DOCTYPE html><html><body><p>Invalid session.</p></body></html>';
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
    echo '<!DOCTYPE html><html><body><p>Could not verify your session.</p></body></html>';
    exit;
}

if (($session->mode ?? '') !== 'setup') {
    http_response_code(400);
    echo '<!DOCTYPE html><html><body><p>Invalid checkout type.</p></body></html>';
    exit;
}

if (($session->status ?? '') !== 'complete') {
    http_response_code(200);
    echo '<!DOCTYPE html><html><body><p>This checkout is not complete yet. You can close this tab.</p></body></html>';
    exit;
}

$userId = (int) ($session->client_reference_id ?? 0);
if ($userId < 1) {
    http_response_code(400);
    echo '<!DOCTYPE html><html><body><p>Missing account reference.</p></body></html>';
    exit;
}

$customerId = is_string($session->customer) ? $session->customer : (string) ($session->customer->id ?? '');
$setupIntent = $session->setup_intent;
if (is_string($setupIntent)) {
    $setupIntent = $stripe->setupIntents->retrieve($setupIntent);
}
$pmRaw = $setupIntent->payment_method ?? null;
$pmId = is_string($pmRaw) ? $pmRaw : (string) ($pmRaw->id ?? '');

if ($customerId !== '' && $pmId !== '') {
    try {
        $stripe->customers->update($customerId, [
            'invoice_settings' => ['default_payment_method' => $pmId],
        ]);
    } catch (\Throwable) {
        // Still mark attached in our database.
    }
}

$pdo = witnessworld_pdo();
$st = $pdo->prepare('SELECT id, stripe_customer_id FROM users WHERE id = ? LIMIT 1');
$st->execute([$userId]);
$row = $st->fetch(PDO::FETCH_ASSOC);
if (!$row) {
    http_response_code(404);
    echo '<!DOCTYPE html><html><body><p>Account not found.</p></body></html>';
    exit;
}

$dbCust = trim((string) ($row['stripe_customer_id'] ?? ''));
if ($dbCust !== '' && $customerId !== '' && $dbCust !== $customerId) {
    http_response_code(403);
    echo '<!DOCTYPE html><html><body><p>Customer mismatch. Contact support if this persists.</p></body></html>';
    exit;
}

$custToStore = $customerId !== '' ? $customerId : ($dbCust !== '' ? $dbCust : null);
$upd = $pdo->prepare(
    'UPDATE users SET stripe_payment_method_status = ?, stripe_customer_id = ? WHERE id = ?'
);
$upd->execute(['attached', $custToStore, $userId]);

echo '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card saved</title></head><body style="font-family:system-ui,sans-serif;padding:24px;line-height:1.5">';
echo '<h1 style="font-size:1.25rem">Payment method saved</h1>';
echo '<p>You can close this window and return to the app. Your profile will show the card as on file after you refresh.</p>';
echo '</body></html>';

<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/commerce_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}
if (($user['status'] ?? '') !== 'verified') {
    ww_json(['ok' => false, 'error' => 'Account must be verified'], 403);
}

$body = ww_read_json();
$buyerId = (int) $user['id'];
$subjectType = strtolower(trim((string) ($body['subject_type'] ?? '')));
$subjectId = (int) ($body['subject_id'] ?? 0);
$quantity = max(1, min(99, (int) ($body['quantity'] ?? 1)));
$buyerName = trim((string) ($body['buyer_name'] ?? ''));
$buyerEmail = trim((string) ($body['buyer_email'] ?? ''));
$buyerPhone = trim((string) ($body['buyer_phone'] ?? ''));
$projectBrief = trim((string) ($body['project_brief'] ?? ''));
$preferredContact = trim((string) ($body['preferred_contact'] ?? ''));
$antiScamAck = !empty($body['anti_scam_ack']);

$shipping = is_array($body['shipping'] ?? null) ? $body['shipping'] : [];
$shippingName = trim((string) ($shipping['name'] ?? ''));
$shippingAddress1 = trim((string) ($shipping['address1'] ?? ''));
$shippingAddress2 = trim((string) ($shipping['address2'] ?? ''));
$shippingCity = trim((string) ($shipping['city'] ?? ''));
$shippingState = trim((string) ($shipping['state'] ?? ''));
$shippingPostalCode = trim((string) ($shipping['postal_code'] ?? ''));
$shippingCountry = trim((string) ($shipping['country'] ?? ''));

if (!in_array($subjectType, ['product', 'listing', 'directory_entry', 'member'], true) || $subjectId <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid request subject'], 422);
}
if ($buyerName === '') {
    $buyerName = trim((string) ($user['first_name'] ?? '') . ' ' . (string) ($user['last_name'] ?? ''));
}
if ($buyerName === '') {
    ww_json(['ok' => false, 'error' => 'Your name is required'], 422);
}
if (!$antiScamAck) {
    ww_json(['ok' => false, 'error' => 'Please confirm the safety reminder before sending.'], 422);
}

try {
    $subject = ww_commerce_subject($pdo, $subjectType, $subjectId);
} catch (Throwable $e) {
    ww_json(['ok' => false, 'error' => $e->getMessage()], 422);
}

$sellerId = (int) $subject['seller_user_id'];
if ($sellerId === $buyerId) {
    ww_json(['ok' => false, 'error' => 'You cannot send a request to yourself.'], 422);
}

$requiresShipping = $subject['request_type'] === 'product_order';
if ($requiresShipping && ($shippingAddress1 === '' || $shippingCity === '' || $shippingCountry === '')) {
    ww_json(['ok' => false, 'error' => 'Shipping address is required for product orders.'], 422);
}
if (!$requiresShipping && $projectBrief === '') {
    ww_json(['ok' => false, 'error' => 'Please describe what you need.'], 422);
}

try {
    $pdo->beginTransaction();
    $st = $pdo->prepare(
        'INSERT INTO commerce_requests (
            buyer_user_id, seller_user_id, subject_type, subject_id, subject_title, subject_image_url,
            request_type, quantity, unit_price, currency, buyer_name, buyer_email, buyer_phone,
            shipping_name, shipping_address1, shipping_address2, shipping_city, shipping_state,
            shipping_postal_code, shipping_country, project_brief, preferred_contact, anti_scam_ack
         ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
    );
    $st->execute([
        $buyerId,
        $sellerId,
        $subjectType,
        $subjectId,
        $subject['title'],
        $subject['image_url'],
        $subject['request_type'],
        $quantity,
        $subject['unit_price'],
        $subject['currency'],
        $buyerName,
        $buyerEmail !== '' ? $buyerEmail : null,
        $buyerPhone !== '' ? $buyerPhone : null,
        $shippingName !== '' ? $shippingName : $buyerName,
        $shippingAddress1 !== '' ? $shippingAddress1 : null,
        $shippingAddress2 !== '' ? $shippingAddress2 : null,
        $shippingCity !== '' ? $shippingCity : null,
        $shippingState !== '' ? $shippingState : null,
        $shippingPostalCode !== '' ? $shippingPostalCode : null,
        $shippingCountry !== '' ? $shippingCountry : null,
        $projectBrief !== '' ? $projectBrief : null,
        $preferredContact !== '' ? $preferredContact : null,
        1,
    ]);
    $requestId = (int) $pdo->lastInsertId();
    ww_commerce_event($pdo, $requestId, $buyerId, 'created', null);
    $pdo->commit();
} catch (Throwable) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    ww_json(['ok' => false, 'error' => 'Could not create request'], 500);
}

ww_commerce_notify(
    $pdo,
    $sellerId,
    'New WWC request received',
    $buyerName . ' sent a new request for "' . $subject['title'] . '". Review it in your Sales Dashboard before accepting.',
    $requestId
);

ww_json(['ok' => true, 'request_id' => $requestId]);

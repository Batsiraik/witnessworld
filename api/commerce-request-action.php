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

$body = ww_read_json();
$requestId = (int) ($body['request_id'] ?? 0);
$action = strtolower(trim((string) ($body['action'] ?? '')));
$note = trim((string) ($body['note'] ?? ''));
$tracking = trim((string) ($body['tracking_number'] ?? ''));
$actorId = (int) $user['id'];

if ($requestId <= 0 || $action === '') {
    ww_json(['ok' => false, 'error' => 'Invalid request action'], 422);
}

try {
    $st = $pdo->prepare('SELECT * FROM commerce_requests WHERE id = ? LIMIT 1');
    $st->execute([$requestId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Request unavailable'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Request not found'], 404);
}

$isBuyer = (int) $row['buyer_user_id'] === $actorId;
$isSeller = (int) $row['seller_user_id'] === $actorId;
if (!$isBuyer && !$isSeller) {
    ww_json(['ok' => false, 'error' => 'Forbidden'], 403);
}

$status = (string) $row['status'];
$next = null;
$timestampCol = null;
$notifyUserId = $isSeller ? (int) $row['buyer_user_id'] : (int) $row['seller_user_id'];
$notifyTitle = 'WWC request updated';
$notifyBody = 'Your request for "' . (string) $row['subject_title'] . '" was updated.';

if ($isSeller) {
    if ($action === 'accept' && $status === 'new') {
        $next = 'accepted';
        $timestampCol = 'accepted_at';
        $notifyBody = 'Your request for "' . (string) $row['subject_title'] . '" was accepted by the seller.';
    } elseif ($action === 'decline' && in_array($status, ['new', 'accepted'], true)) {
        $next = 'declined';
        $notifyBody = 'Your request for "' . (string) $row['subject_title'] . '" was declined by the seller.';
    } elseif ($action === 'in_progress' && in_array($status, ['accepted', 'ready'], true)) {
        $next = 'in_progress';
        $notifyBody = 'Work has started for "' . (string) $row['subject_title'] . '".';
    } elseif ($action === 'ready' && in_array($status, ['accepted', 'in_progress'], true)) {
        $next = 'ready';
        $notifyBody = '"' . (string) $row['subject_title'] . '" is marked ready by the seller.';
    } elseif ($action === 'shipped' && in_array($status, ['accepted', 'in_progress', 'ready'], true)) {
        $next = 'shipped';
        $timestampCol = 'shipped_at';
        $notifyBody = '"' . (string) $row['subject_title'] . '" was marked shipped.';
    }
}

if ($isBuyer) {
    if ($action === 'cancel' && in_array($status, ['new', 'accepted'], true)) {
        $next = 'cancelled';
        $notifyBody = 'The buyer cancelled the request for "' . (string) $row['subject_title'] . '".';
    } elseif ($action === 'delivered' && in_array($status, ['shipped', 'ready', 'in_progress'], true)) {
        $next = 'delivered';
        $timestampCol = 'delivered_at';
        $notifyBody = 'The buyer marked "' . (string) $row['subject_title'] . '" as delivered/received.';
    } elseif ($action === 'complete' && in_array($status, ['delivered', 'ready'], true)) {
        $next = 'completed';
        $timestampCol = 'completed_at';
        $notifyBody = 'The buyer completed the request for "' . (string) $row['subject_title'] . '".';
    }
}

if ($action === 'dispute' && !in_array($status, ['completed', 'declined', 'cancelled'], true)) {
    $next = 'disputed';
    $notifyBody = 'A dispute was opened for "' . (string) $row['subject_title'] . '". Please keep all communication in WWC.';
}

if ($next === null) {
    ww_json(['ok' => false, 'error' => 'This action is not available for the current status.'], 422);
}

try {
    $sets = ['status = ?', 'seller_note = COALESCE(?, seller_note)'];
    $params = [$next, $note !== '' ? $note : null];
    if ($tracking !== '') {
        $sets[] = 'tracking_number = ?';
        $params[] = $tracking;
    }
    if ($timestampCol !== null) {
        $sets[] = $timestampCol . ' = ?';
        $params[] = date('Y-m-d H:i:s');
    }
    $params[] = $requestId;
    $up = $pdo->prepare('UPDATE commerce_requests SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $up->execute($params);
    ww_commerce_event($pdo, $requestId, $actorId, $action, $note !== '' ? $note : null);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not update request'], 500);
}

ww_commerce_notify($pdo, $notifyUserId, $notifyTitle, $notifyBody, $requestId);

ww_json(['ok' => true, 'status' => $next]);

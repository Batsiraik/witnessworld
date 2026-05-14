<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/commerce_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
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

$requestId = (int) ($_GET['id'] ?? 0);
if ($requestId <= 0) {
    ww_json(['ok' => false, 'error' => 'Invalid request id'], 422);
}

$userId = (int) $user['id'];

try {
    $st = $pdo->prepare(
        'SELECT r.*,
                bu.username AS buyer_username, bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name,
                su.username AS seller_username, su.first_name AS seller_first_name, su.last_name AS seller_last_name
         FROM commerce_requests r
         INNER JOIN users bu ON bu.id = r.buyer_user_id
         INNER JOIN users su ON su.id = r.seller_user_id
         WHERE r.id = ?
         LIMIT 1'
    );
    $st->execute([$requestId]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Request unavailable'], 500);
}

if (!$row) {
    ww_json(['ok' => false, 'error' => 'Not found'], 404);
}

$buyerId = (int) $row['buyer_user_id'];
$sellerId = (int) $row['seller_user_id'];
if ($buyerId !== $userId && $sellerId !== $userId) {
    ww_json(['ok' => false, 'error' => 'Forbidden'], 403);
}

$preview = ww_commerce_subject_preview($pdo, (string) $row['subject_type'], (int) $row['subject_id']);

ww_json(['ok' => true, 'request' => ww_commerce_row($row), 'subject_preview' => $preview]);

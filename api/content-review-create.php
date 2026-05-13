<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

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
$requestId = (int) ($body['request_id'] ?? 0);
$rating = (int) ($body['rating'] ?? 0);
$title = trim((string) ($body['title'] ?? ''));
$reviewBody = trim((string) ($body['body'] ?? ''));
$userId = (int) $user['id'];

if ($requestId <= 0) {
    ww_json(['ok' => false, 'error' => 'request_id required'], 422);
}
if ($rating < 1 || $rating > 5) {
    ww_json(['ok' => false, 'error' => 'Rating must be between 1 and 5'], 422);
}
if ($reviewBody === '' || mb_strlen($reviewBody) > 4000) {
    ww_json(['ok' => false, 'error' => 'Review is required (max 4000 characters)'], 422);
}
if (mb_strlen($title) > 140) {
    ww_json(['ok' => false, 'error' => 'Review title is too long'], 422);
}

try {
    $st = $pdo->prepare(
        'SELECT id, buyer_user_id, seller_user_id, subject_type, subject_id, status
         FROM commerce_requests
         WHERE id = ? LIMIT 1'
    );
    $st->execute([$requestId]);
    $req = $st->fetch(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Request unavailable'], 500);
}

if (!$req || (int) $req['buyer_user_id'] !== $userId) {
    ww_json(['ok' => false, 'error' => 'Request not found'], 404);
}
if ((string) $req['status'] !== 'completed') {
    ww_json(['ok' => false, 'error' => 'You can review after the request is completed.'], 422);
}

try {
    $ins = $pdo->prepare(
        'INSERT INTO content_reviews
         (request_id, reviewer_user_id, subject_type, subject_id, seller_user_id, rating, title, body)
         VALUES (?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $requestId,
        $userId,
        (string) $req['subject_type'],
        (int) $req['subject_id'],
        (int) $req['seller_user_id'],
        $rating,
        $title !== '' ? $title : null,
        $reviewBody,
    ]);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'You already reviewed this request or the review could not be saved.'], 422);
}

ww_json(['ok' => true]);

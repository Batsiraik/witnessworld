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

$userId = (int) $user['id'];
$body = ww_read_json();
$entryId = (int) ($body['entry_id'] ?? 0);
if ($entryId <= 0) {
    ww_json(['ok' => false, 'error' => 'entry_id required'], 422);
}

try {
    $del = $pdo->prepare(
        "DELETE FROM directory_entries WHERE id = ? AND user_id = ? AND moderation_status IN ('pending_approval','rejected')"
    );
    $del->execute([$entryId, $userId]);
    if ($del->rowCount() === 0) {
        ww_json(['ok' => false, 'error' => 'Not found or only pending/rejected listings can be deleted'], 404);
    }
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Could not delete'], 500);
}

ww_json(['ok' => true, 'message' => 'Listing deleted.']);

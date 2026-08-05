<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/analytics.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$pdo = witnessworld_pdo();
$tok = ww_bearer_token();
$user = $tok ? ww_user_from_token($pdo, $tok) : null;
$viewerId = $user ? (int) $user['id'] : null;

$body = ww_read_json();
$event = strtolower(trim((string) ($body['event'] ?? '')));
$deviceId = trim((string) ($body['device_id'] ?? ''));
$source = isset($body['source']) ? (string) $body['source'] : null;

if ($event === 'content_view') {
    $subjectType = strtolower(trim((string) ($body['subject_type'] ?? '')));
    $subjectId = (int) ($body['subject_id'] ?? 0);
    $result = ww_analytics_track_content($pdo, $subjectType, $subjectId, $viewerId, $deviceId, $source);
    if (!$result['ok'] && ($result['reason'] ?? '') === 'device_id_required') {
        ww_json(['ok' => false, 'error' => 'device_id required'], 422);
    }
    if (!$result['ok'] && ($result['reason'] ?? '') === 'invalid_subject') {
        ww_json(['ok' => false, 'error' => 'Invalid subject'], 422);
    }
    if (!$result['ok'] && ($result['reason'] ?? '') === 'not_found') {
        ww_json(['ok' => false, 'error' => 'Not found'], 404);
    }
    if (!$result['ok']) {
        ww_json(['ok' => false, 'error' => 'Could not record view'], 500);
    }
    ww_json(['ok' => true, 'counted' => !empty($result['counted']), 'reason' => $result['reason'] ?? null]);
}

if ($event === 'module_view') {
    $moduleKey = strtolower(trim((string) ($body['module'] ?? $body['module_key'] ?? '')));
    $result = ww_analytics_track_module($pdo, $moduleKey, $viewerId, $deviceId, $source);
    if (!$result['ok'] && ($result['reason'] ?? '') === 'device_id_required') {
        ww_json(['ok' => false, 'error' => 'device_id required'], 422);
    }
    if (!$result['ok'] && ($result['reason'] ?? '') === 'invalid_module') {
        ww_json(['ok' => false, 'error' => 'Invalid module'], 422);
    }
    if (!$result['ok']) {
        ww_json(['ok' => false, 'error' => 'Could not record view'], 500);
    }
    ww_json(['ok' => true, 'counted' => !empty($result['counted'])]);
}

ww_json(['ok' => false, 'error' => 'Unknown event'], 422);

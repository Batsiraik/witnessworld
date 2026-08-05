<?php

declare(strict_types=1);

/**
 * Hostinger cron (or any scheduler) — send day-7 onboarding emails.
 *
 * Example (daily):
 *   curl -fsS "https://witnessworldconnect.com/api/cron-onboarding-emails.php?key=YOUR_SECRET"
 *
 * Or:
 *   curl -fsS -H "X-Cron-Key: YOUR_SECRET" "https://witnessworldconnect.com/api/cron-onboarding-emails.php"
 */

require_once __DIR__ . '/bootstrap.php';
require_once dirname(__DIR__) . '/admin/includes/settings_store.php';
require_once dirname(__DIR__) . '/admin/includes/push_triggers.php';

if (!in_array(($_SERVER['REQUEST_METHOD'] ?? 'GET'), ['GET', 'POST'], true)) {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$pdo = witnessworld_pdo();

$secret = trim((string) (ww_get_setting($pdo, 'cron_secret', '') ?? ''));
if ($secret === '') {
    ww_json([
        'ok' => false,
        'error' => 'cron_secret is not set. Generate it under Admin → Settings.',
    ], 503);
}

$provided = trim((string) ($_GET['key'] ?? $_POST['key'] ?? ''));
if ($provided === '') {
    $provided = trim((string) ($_SERVER['HTTP_X_CRON_KEY'] ?? ''));
}

if ($provided === '' || !hash_equals($secret, $provided)) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$limit = (int) ($_GET['limit'] ?? $_POST['limit'] ?? 50);
$result = ww_admin_process_week1_onboarding_emails($pdo, $limit);

ww_json([
    'ok' => !empty($result['ok']),
    'job' => 'week1_onboarding_email',
    'due' => (int) ($result['due'] ?? 0),
    'sent' => (int) ($result['sent'] ?? 0),
    'failed' => (int) ($result['failed'] ?? 0),
    'error' => $result['error'] ?? null,
    'ran_at' => gmdate('c'),
]);

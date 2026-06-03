<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_notifications.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = witnessworld_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input') ?: '', true);
    if (!is_array($body)) {
        $body = $_POST;
    }
    $action = (string) ($body['action'] ?? 'mark_all_read');
    if ($action === 'mark_all_read') {
        ww_admin_notifications_mark_all_read($pdo);
    } elseif ($action === 'mark_read' && !empty($body['ids']) && is_array($body['ids'])) {
        $ids = array_values(array_filter(array_map('intval', $body['ids']), static fn (int $id) => $id > 0));
        if ($ids !== []) {
            $placeholders = implode(',', array_fill(0, count($ids), '?'));
            try {
                $st = $pdo->prepare("UPDATE admin_notifications SET is_read = 1 WHERE id IN ($placeholders)");
                $st->execute($ids);
            } catch (Throwable) {
            }
        }
    }
    echo json_encode([
        'ok' => true,
        'unread_count' => ww_admin_notifications_unread_count($pdo),
    ]);
    exit;
}

if ($method !== 'GET') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$sinceId = (int) ($_GET['since_id'] ?? 0);
$notifications = ww_admin_notifications_list($pdo, 40);
$unread = ww_admin_notifications_unread_count($pdo);
$hasNew = false;
if ($sinceId > 0) {
    foreach ($notifications as $n) {
        if ((int) ($n['id'] ?? 0) > $sinceId && empty($n['is_read'])) {
            $hasNew = true;
            break;
        }
    }
}

echo json_encode([
    'ok' => true,
    'notifications' => $notifications,
    'unread_count' => $unread,
    'has_new' => $hasNew,
    'latest_id' => $notifications !== [] ? (int) $notifications[0]['id'] : 0,
]);

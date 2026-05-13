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

$role = strtolower(trim((string) ($_GET['role'] ?? 'buyer')));
if (!in_array($role, ['buyer', 'seller'], true)) {
    $role = 'buyer';
}
$userId = (int) $user['id'];
$where = $role === 'seller' ? 'r.seller_user_id = ?' : 'r.buyer_user_id = ?';

try {
    $st = $pdo->prepare(
        'SELECT r.*,
                bu.username AS buyer_username, bu.first_name AS buyer_first_name, bu.last_name AS buyer_last_name,
                su.username AS seller_username, su.first_name AS seller_first_name, su.last_name AS seller_last_name
         FROM commerce_requests r
         INNER JOIN users bu ON bu.id = r.buyer_user_id
         INNER JOIN users su ON su.id = r.seller_user_id
         WHERE ' . $where . '
         ORDER BY r.updated_at DESC, r.id DESC
         LIMIT 100'
    );
    $st->execute([$userId]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Requests unavailable'], 500);
}

$out = [];
foreach ($rows as $row) {
    $out[] = ww_commerce_row($row);
}

ww_json(['ok' => true, 'role' => $role, 'requests' => $out]);

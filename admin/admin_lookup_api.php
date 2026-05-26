<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/admin_create_content.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = witnessworld_pdo();
$action = (string) ($_GET['action'] ?? 'users');

if ($action === 'users') {
    $q = trim((string) ($_GET['q'] ?? ''));
    $limit = min(40, max(5, (int) ($_GET['limit'] ?? 25)));
    $sql = 'SELECT id, email, first_name, last_name, username, status FROM users WHERE 1=1';
    $params = [];
    if ($q !== '') {
        $sql .= ' AND (email LIKE ? OR username LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR CAST(id AS CHAR) = ?)';
        $like = '%' . $q . '%';
        $params = [$like, $like, $like, $like, $q];
    }
    $sql .= ' ORDER BY id DESC LIMIT ' . $limit;
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $items = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $items[] = [
            'id' => (int) $r['id'],
            'email' => (string) $r['email'],
            'username' => (string) $r['username'],
            'status' => (string) $r['status'],
            'label' => ww_admin_user_label($r),
        ];
    }
    echo json_encode(['ok' => true, 'items' => $items]);
    exit;
}

if ($action === 'stores') {
    $q = trim((string) ($_GET['q'] ?? ''));
    $userId = (int) ($_GET['user_id'] ?? 0);
    $limit = min(40, max(5, (int) ($_GET['limit'] ?? 25)));
    $sql = 'SELECT s.id, s.name, s.moderation_status, s.user_id, u.first_name, u.last_name, u.username
            FROM stores s INNER JOIN users u ON u.id = s.user_id WHERE 1=1';
    $params = [];
    if ($userId > 0) {
        $sql .= ' AND s.user_id = ?';
        $params[] = $userId;
    }
    if ($q !== '') {
        $sql .= ' AND (s.name LIKE ? OR u.username LIKE ? OR CAST(s.id AS CHAR) = ?)';
        $like = '%' . $q . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $q;
    }
    $sql .= ' ORDER BY s.id DESC LIMIT ' . $limit;
    $st = $pdo->prepare($sql);
    $st->execute($params);
    $items = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $items[] = [
            'id' => (int) $r['id'],
            'name' => (string) $r['name'],
            'moderation_status' => (string) $r['moderation_status'],
            'user_id' => (int) $r['user_id'],
            'owner' => ww_admin_user_label($r),
        ];
    }
    echo json_encode(['ok' => true, 'items' => $items]);
    exit;
}

if ($action === 'categories') {
    $type = (string) ($_GET['type'] ?? '');
    $tables = [
        'classified' => 'marketplace_categories',
        'service' => 'service_categories',
        'community' => 'community_categories',
        'store' => 'store_categories',
        'directory' => 'directory_categories',
    ];
    if (!isset($tables[$type])) {
        echo json_encode(['ok' => false, 'error' => 'Invalid type']);
        exit;
    }
    $table = $tables[$type];
    $rows = $pdo->query(
        "SELECT id, name FROM {$table} WHERE is_active = 1 ORDER BY sort_order ASC, name ASC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $items = array_map(static fn ($r) => ['id' => (int) $r['id'], 'name' => (string) $r['name']], $rows);
    echo json_encode(['ok' => true, 'items' => $items]);
    exit;
}

if ($action === 'locations') {
    $byCode = [];
    foreach (ww_listing_country_map() as $code => $name) {
        $byCode[$code] = ['code' => $code, 'name' => $name];
    }
    $pinned = [];
    foreach (['US', 'CA', 'GB'] as $pin) {
        if (isset($byCode[$pin])) {
            $pinned[] = $byCode[$pin];
            unset($byCode[$pin]);
        }
    }
    $rest = array_values($byCode);
    usort($rest, static fn (array $a, array $b): int => strcasecmp((string) $a['name'], (string) $b['name']));
    $countries = array_merge($pinned, $rest);

    $states = [];
    foreach (ww_listing_us_state_map() as $code => $name) {
        $states[] = ['code' => $code, 'name' => $name];
    }
    echo json_encode(['ok' => true, 'countries' => $countries, 'us_states' => $states]);
    exit;
}

echo json_encode(['ok' => false, 'error' => 'Unknown action']);

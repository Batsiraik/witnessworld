<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = witnessworld_pdo();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'POST') {
    $action = (string) ($_POST['action'] ?? '');
    $id = (int) ($_POST['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['ok' => false, 'error' => 'Invalid listing id']);
        exit;
    }
    if ($action === 'add') {
        $pdo->prepare('UPDATE listings SET is_featured = 1 WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true, 'message' => 'Added to featured']);
        exit;
    }
    if ($action === 'remove') {
        $pdo->prepare('UPDATE listings SET is_featured = 0 WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true, 'message' => 'Removed from featured']);
        exit;
    }
    echo json_encode(['ok' => false, 'error' => 'Unknown action']);
    exit;
}

$q = trim((string) ($_GET['q'] ?? ''));
$onlyNonFeatured = isset($_GET['available']) && (string) $_GET['available'] === '1';
$limit = min(50, max(5, (int) ($_GET['limit'] ?? 30)));

$sql = 'SELECT l.id, l.title, l.listing_type, l.moderation_status, l.is_featured,
        l.created_at, u.first_name, u.last_name, u.username
        FROM listings l
        INNER JOIN users u ON u.id = l.user_id
        WHERE l.moderation_status != ?';
$params = ['removed'];

if ($onlyNonFeatured) {
    $sql .= ' AND l.is_featured = 0';
}

if ($q !== '') {
    $sql .= ' AND (l.title LIKE ? OR u.username LIKE ? OR u.email LIKE ? OR CAST(l.id AS CHAR) = ?)';
    $like = '%' . $q . '%';
    $params[] = $like;
    $params[] = $like;
    $params[] = $like;
    $params[] = $q;
}

$sql .= ' ORDER BY l.is_featured DESC, FIELD(l.moderation_status, \'approved\', \'pending_approval\', \'rejected\'), l.id DESC LIMIT ' . $limit;

$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll(PDO::FETCH_ASSOC);

$items = [];
foreach ($rows as $r) {
    $seller = trim((string) $r['first_name'] . ' ' . (string) $r['last_name']);
    if ($seller === '') {
        $seller = (string) $r['username'];
    }
    $items[] = [
        'id' => (int) $r['id'],
        'title' => (string) $r['title'],
        'listing_type' => (string) $r['listing_type'],
        'moderation_status' => (string) $r['moderation_status'],
        'is_featured' => (int) ($r['is_featured'] ?? 0) === 1,
        'created_at' => (string) $r['created_at'],
        'seller_label' => $seller,
        'username' => (string) $r['username'],
    ];
}

echo json_encode(['ok' => true, 'items' => $items]);

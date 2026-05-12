<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$pdo = witnessworld_pdo();

try {
    $st = $pdo->query(
        'SELECT id, name, slug FROM store_categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'
    );
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable) {
    ww_json(['ok' => true, 'categories' => []]);
}

$list = [];
foreach ($rows as $r) {
    $list[] = [
        'id'   => (int) $r['id'],
        'name' => (string) $r['name'],
        'slug' => (string) $r['slug'],
    ];
}

ww_json(['ok' => true, 'categories' => $list]);

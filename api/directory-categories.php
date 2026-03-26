<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/directory_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$list = [];
foreach (ww_directory_categories() as $slug => $label) {
    $list[] = ['slug' => $slug, 'label' => $label];
}

ww_json(['ok' => true, 'categories' => $list]);

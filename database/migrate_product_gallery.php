<?php

declare(strict_types=1);

/**
 * One-shot migration: add store_products.gallery_urls_json
 * Run once via CLI: php database/migrate_product_gallery.php
 * Or open briefly in browser while logged into admin (guarded).
 */

require_once dirname(__DIR__) . '/admin/includes/conn.php';

$pdo = witnessworld_pdo();

try {
    $cols = $pdo->query('SHOW COLUMNS FROM store_products LIKE \'gallery_urls_json\'')->fetchAll();
    if ($cols) {
        echo "OK: gallery_urls_json already exists.\n";
        exit(0);
    }
    $pdo->exec('ALTER TABLE store_products ADD COLUMN gallery_urls_json TEXT NULL AFTER image_url');
    echo "OK: added gallery_urls_json to store_products.\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'ERROR: ' . $e->getMessage() . "\n");
    exit(1);
}

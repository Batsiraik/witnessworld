<?php

declare(strict_types=1);

function ww_store_user_upload_prefix(int $userId): string
{
    $base = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');

    return $base . '/uploads/stores/' . $userId . '/';
}

function ww_store_logo_banner_url_belongs_to_user(string $url, int $userId): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }

    return str_starts_with($url, ww_store_user_upload_prefix($userId));
}

function ww_store_product_upload_prefix(int $storeId): string
{
    $base = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');

    return $base . '/uploads/store-products/' . $storeId . '/';
}

function ww_store_product_image_url_belongs_to_store(string $url, int $storeId): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }

    return str_starts_with($url, ww_store_product_upload_prefix($storeId));
}

/**
 * @return list<string>
 */
function ww_store_delivery_types(): array
{
    return ['digital_only', 'usa_only', 'worldwide', 'local_pickup', 'custom'];
}

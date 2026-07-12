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

const WW_PRODUCT_GALLERY_MAX = 8;

/**
 * @param array<string, mixed> $row store_products row (image_url + optional gallery_urls_json)
 * @return list<string>
 */
function ww_product_gallery_urls_from_row(array $row): array
{
    $urls = [];
    if (!empty($row['gallery_urls_json'])) {
        $decoded = json_decode((string) $row['gallery_urls_json'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $u) {
                if (is_string($u)) {
                    $t = trim($u);
                    if ($t !== '') {
                        $urls[] = $t;
                    }
                }
            }
        }
    }
    $primary = trim((string) ($row['image_url'] ?? ''));
    if ($primary !== '' && !in_array($primary, $urls, true)) {
        array_unshift($urls, $primary);
    }
    $out = [];
    foreach ($urls as $u) {
        if (!in_array($u, $out, true)) {
            $out[] = $u;
        }
    }

    return array_slice($out, 0, WW_PRODUCT_GALLERY_MAX);
}

/**
 * Normalize create/update image payload into primary URL + gallery JSON.
 *
 * @param mixed $galleryIn list|null from JSON body (gallery_urls)
 * @return array{ok:bool, image_url?:string, gallery_json?:?string, error?:string}
 */
function ww_normalize_product_images(mixed $galleryIn, string $imageUrl, int $storeId): array
{
    $candidates = [];
    if (is_array($galleryIn)) {
        foreach ($galleryIn as $u) {
            if (is_string($u)) {
                $t = trim($u);
                if ($t !== '') {
                    $candidates[] = $t;
                }
            }
        }
    }
    $primary = trim($imageUrl);
    if ($primary !== '' && !in_array($primary, $candidates, true)) {
        array_unshift($candidates, $primary);
    }

    $unique = [];
    foreach ($candidates as $u) {
        if (!in_array($u, $unique, true)) {
            $unique[] = $u;
        }
    }
    $unique = array_slice($unique, 0, WW_PRODUCT_GALLERY_MAX);

    if ($unique === []) {
        return ['ok' => false, 'error' => 'Product photo is required — upload at least one image'];
    }

    foreach ($unique as $u) {
        if (!ww_store_product_image_url_belongs_to_store($u, $storeId)) {
            return ['ok' => false, 'error' => 'Invalid product image URL'];
        }
    }

    $imageDb = $unique[0];
    $galleryJson = count($unique) > 1 ? json_encode(array_values($unique), JSON_UNESCAPED_SLASHES) : json_encode([$imageDb], JSON_UNESCAPED_SLASHES);

    return [
        'ok' => true,
        'image_url' => $imageDb,
        'gallery_json' => $galleryJson,
    ];
}

/**
 * @return list<string>
 */
function ww_store_delivery_types(): array
{
    return ['digital_only', 'usa_only', 'worldwide', 'local_pickup', 'custom'];
}

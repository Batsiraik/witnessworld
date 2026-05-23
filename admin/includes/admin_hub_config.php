<?php

declare(strict_types=1);

/**
 * @return array<string, array{label:string, desc:string, listing_type?:string}>
 */
function ww_admin_content_tabs(): array
{
    return [
        'classified' => [
            'label' => 'Marketplace',
            'desc' => 'Classified buy/sell listings',
            'listing_type' => 'classified',
        ],
        'service' => [
            'label' => 'Services',
            'desc' => 'Professional service gigs',
            'listing_type' => 'service',
        ],
        'community' => [
            'label' => 'Community',
            'desc' => 'Community classifieds',
            'listing_type' => 'community',
        ],
        'stores' => [
            'label' => 'Online stores',
            'desc' => 'Storefronts & moderation',
        ],
        'products' => [
            'label' => 'Store products',
            'desc' => 'Products in online stores',
        ],
        'directory' => [
            'label' => 'Business directory',
            'desc' => 'Business directory profiles',
        ],
    ];
}

function ww_admin_content_tab_resolve(string $tab): string
{
    $tabs = ww_admin_content_tabs();
    return isset($tabs[$tab]) ? $tab : 'classified';
}

function ww_admin_content_url(string $tab, string $base = '', array $query = []): string
{
    $tab = ww_admin_content_tab_resolve($tab);
    $path = ($base === '' || $base === '.') ? 'content.php' : $base . '/content.php';
    $query['tab'] = $tab;
    $qs = http_build_query($query);

    return $path . ($qs !== '' ? '?' . $qs : '');
}

function ww_admin_content_tab_for_entity(string $entityType, ?string $listingType = null): string
{
    return match ($entityType) {
        'store' => 'stores',
        'product' => 'products',
        'directory' => 'directory',
        default => ww_admin_content_tab_resolve((string) ($listingType ?: 'classified')),
    };
}

/**
 * @return array<string, array{label:string, desc:string, table:string, fk_table:string, fk_column:string}>
 */
function ww_admin_category_tabs(): array
{
    return [
        'classified' => [
            'label' => 'Marketplace',
            'desc' => 'Categories for classified ads',
            'table' => 'marketplace_categories',
            'fk_table' => 'listings',
            'fk_column' => 'category_id',
            'listing_type' => 'classified',
        ],
        'service' => [
            'label' => 'Services',
            'desc' => 'Service listing categories',
            'table' => 'service_categories',
            'fk_table' => 'listings',
            'fk_column' => 'category_id',
            'listing_type' => 'service',
        ],
        'community' => [
            'label' => 'Community',
            'desc' => 'Community board categories',
            'table' => 'community_categories',
            'fk_table' => 'listings',
            'fk_column' => 'category_id',
            'listing_type' => 'community',
        ],
        'store' => [
            'label' => 'Online stores',
            'desc' => 'Store categories',
            'table' => 'store_categories',
            'fk_table' => 'stores',
            'fk_column' => 'category_id',
        ],
        'directory' => [
            'label' => 'Business directory',
            'desc' => 'Directory business categories',
            'table' => 'directory_categories',
            'fk_table' => 'directory_entries',
            'fk_column' => 'category_id',
        ],
    ];
}

function ww_admin_category_tab_resolve(string $tab): string
{
    $tabs = ww_admin_category_tabs();
    return isset($tabs[$tab]) ? $tab : 'classified';
}

function ww_admin_categories_url(string $tab, string $base = '', array $query = []): string
{
    $tab = ww_admin_category_tab_resolve($tab);
    $path = ($base === '' || $base === '.') ? 'categories.php' : $base . '/categories.php';
    $query['tab'] = $tab;
    $qs = http_build_query($query);

    return $path . ($qs !== '' ? '?' . $qs : '');
}

function ww_admin_module_tabs(string $selfUrl, array $tabs, string $activeKey, array $query = []): string
{
    $html = '<div class="admin-module-tabs flex flex-wrap gap-2 mb-1">';
    foreach ($tabs as $key => $meta) {
        $label = is_array($meta) ? (string) ($meta['label'] ?? $key) : (string) $meta;
        $q = $query;
        $q['tab'] = $key;
        unset($q['status']);
        $href = $selfUrl . '?' . http_build_query($q);
        $active = $key === $activeKey;
        $html .= ww_admin_filter_chip($href, $label, $active, $active ? 'brand' : 'neutral');
    }
    $html .= '</div>';

    return $html;
}

function ww_admin_hub_status_chip(string $pageUrl, string $tab, string $key, string $label, string $curFilter, array $tones): string
{
    $q = ['tab' => $tab];
    if ($key !== 'all') {
        $q['status'] = $key;
    }
    $tone = $tones[$key] ?? 'brand';

    return ww_admin_filter_chip($pageUrl . '?' . http_build_query($q), $label, $curFilter === $key, $tone);
}

function ww_admin_content_return_token(string $tab): string
{
    return 'list:' . ww_admin_content_tab_resolve($tab);
}

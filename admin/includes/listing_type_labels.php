<?php

declare(strict_types=1);

/**
 * User-facing module names for listing_type storage values.
 * classified = Marketplace (buy/sell); community = Classifieds (community needs).
 */
function ww_listing_type_label(string $listingType): string
{
    return match (strtolower(trim($listingType))) {
        'service' => 'Professional services',
        'classified' => 'Marketplace',
        'community' => 'Classifieds',
        default => $listingType !== '' ? $listingType : 'Listing',
    };
}

function ww_listing_type_short_label(string $listingType): string
{
    return match (strtolower(trim($listingType))) {
        'service' => 'Service',
        'classified' => 'Marketplace',
        'community' => 'Classifieds',
        default => $listingType !== '' ? $listingType : 'Listing',
    };
}

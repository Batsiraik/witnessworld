<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/listing_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$countries = [];
foreach (ww_listing_country_map() as $code => $name) {
    $countries[] = ['code' => $code, 'name' => $name];
}

/** Pin common countries at the top (ISO 3166-1 alpha-2). Remaining list A–Z by name. */
$pinnedOrder = ['US', 'CA', 'GB'];
$byCode = [];
foreach ($countries as $c) {
    $byCode[(string) $c['code']] = $c;
}
$ordered = [];
foreach ($pinnedOrder as $pin) {
    if (isset($byCode[$pin])) {
        $ordered[] = $byCode[$pin];
        unset($byCode[$pin]);
    }
}
$rest = array_values($byCode);
usort(
    $rest,
    static function (array $a, array $b): int {
        return strcasecmp((string) $a['name'], (string) $b['name']);
    }
);
$countries = array_merge($ordered, $rest);

$usStates = [];
foreach (ww_listing_us_state_map() as $code => $name) {
    $usStates[] = ['code' => $code, 'name' => $name];
}
usort(
    $usStates,
    static function (array $a, array $b): int {
        return strcasecmp((string) $a['name'], (string) $b['name']);
    }
);

ww_json([
    'ok' => true,
    'countries' => $countries,
    'us_states' => $usStates,
    'us_country_code' => 'US',
]);

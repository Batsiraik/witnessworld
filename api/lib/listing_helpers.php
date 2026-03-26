<?php

declare(strict_types=1);

/**
 * @return array<string, string> ISO alpha-2 => canonical English name
 */
function ww_listing_country_map(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $path = __DIR__ . '/../data/iso-countries-raw.json';
    if (!is_readable($path)) {
        return $cache = [];
    }
    $raw = file_get_contents($path);
    $arr = is_string($raw) ? json_decode($raw, true) : null;
    if (!is_array($arr)) {
        return $cache = [];
    }
    $out = [];
    foreach ($arr as $row) {
        if (!is_array($row)) {
            continue;
        }
        $code = strtoupper(trim((string) ($row['alpha-2'] ?? '')));
        $name = trim((string) ($row['name'] ?? ''));
        if ($code !== '' && $name !== '') {
            $out[$code] = $name;
        }
    }
    return $cache = $out;
}

/**
 * @return array<string, string> US state code => name
 */
function ww_listing_us_state_map(): array
{
    static $cache = null;
    if ($cache !== null) {
        return $cache;
    }
    $path = __DIR__ . '/../data/us-states.json';
    if (!is_readable($path)) {
        return $cache = [];
    }
    $raw = file_get_contents($path);
    $data = is_string($raw) ? json_decode($raw, true) : null;
    $states = is_array($data) && isset($data['states']) && is_array($data['states']) ? $data['states'] : [];
    $out = [];
    foreach ($states as $s) {
        if (!is_array($s)) {
            continue;
        }
        $code = strtoupper(trim((string) ($s['code'] ?? '')));
        $name = trim((string) ($s['name'] ?? ''));
        if ($code !== '' && $name !== '') {
            $out[$code] = $name;
        }
    }
    return $cache = $out;
}

function ww_listing_user_upload_prefix(int $userId): string
{
    $base = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');

    return $base . '/uploads/listings/' . $userId . '/';
}

function ww_listing_url_belongs_to_user(string $url, int $userId): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }
    $prefix = ww_listing_user_upload_prefix($userId);

    return str_starts_with($url, $prefix);
}

function ww_listing_us_state_code_from_name(?string $name): ?string
{
    if ($name === null) {
        return null;
    }
    $nameNorm = trim($name);
    if ($nameNorm === '') {
        return null;
    }
    foreach (ww_listing_us_state_map() as $code => $n) {
        if (strcasecmp($n, $nameNorm) === 0) {
            return $code;
        }
    }

    return null;
}

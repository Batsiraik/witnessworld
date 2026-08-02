<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';
require_once __DIR__ . '/lib/directory_helpers.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
$pdo = witnessworld_pdo();
$user = $tok ? ww_user_from_token($pdo, $tok) : null;
if ($tok && !$user) {
    $user = null;
}
$viewerId = $user ? (int) $user['id'] : 0;

$section = strtolower(trim((string) ($_GET['section'] ?? 'all')));
if (!in_array($section, ['all', 'marketplace', 'services', 'community', 'stores', 'businesses', 'directory', 'classifieds', 'products'], true)) {
    $section = 'all';
}
if ($section === 'businesses') {
    $section = 'directory';
}

$limit = (int) ($_GET['limit'] ?? 50);
if ($limit < 1) {
    $limit = 50;
}
if ($limit > 50) {
    $limit = 50;
}
$offset = (int) ($_GET['offset'] ?? 0);
if ($offset < 0) {
    $offset = 0;
}

$country = strtoupper(trim((string) ($_GET['country'] ?? '')));
if ($country !== '' && strlen($country) !== 2) {
    $country = '';
}
$usState = trim((string) ($_GET['us_state'] ?? ''));
if ($usState !== '' && strlen($usState) > 64) {
    $usState = '';
}

$categoryId = (int) ($_GET['category_id'] ?? 0);
if ($categoryId < 0) {
    $categoryId = 0;
}

/**
 * @return list<string>
 */
function ww_discover_kinds(string $section): array
{
    return match ($section) {
        'services' => ['service'],
        'community' => ['community'],
        'classifieds' => ['classified'],
        'products' => ['product'],
        'stores' => ['store'],
        'directory' => ['directory'],
        'marketplace' => ['classified', 'product'],
        default => ['service', 'classified', 'community', 'product', 'store', 'directory'],
    };
}

/**
 * @return array{0: string, 1: list<string>}
 */
function ww_discover_loc_sql(string $alias, string $country, string $usState): array
{
    $sql = '';
    $params = [];
    if ($country !== '') {
        $sql .= " AND {$alias}.location_country_code = ?";
        $params[] = $country;
    }
    if ($usState !== '') {
        $sql .= " AND {$alias}.location_us_state = ?";
        $params[] = $usState;
    }
    return [$sql, $params];
}

/**
 * @param list<string> $kinds
 * @return array{0: string, 1: list<string|int>}
 */
function ww_discover_index_sql(array $kinds, string $country, string $usState, int $viewerId, int $categoryId = 0): array
{
    $parts = [];
    $params = [];

    foreach ($kinds as $kind) {
        if (in_array($kind, ['service', 'classified', 'community'], true)) {
            [$locSql, $locParams] = ww_discover_loc_sql('l', $country, $usState);
            $catSql = '';
            if ($categoryId > 0) {
                $catSql = ' AND l.category_id = ?';
            }
            $parts[] = "SELECT '{$kind}' AS kind, l.id AS ref_id, l.created_at
                        FROM listings l
                        WHERE l.moderation_status = ? AND l.listing_type = ?" . $locSql . $catSql;
            $params[] = 'approved';
            $params[] = $kind;
            foreach ($locParams as $p) {
                $params[] = $p;
            }
            if ($categoryId > 0) {
                $params[] = $categoryId;
            }
            continue;
        }
        if ($kind === 'product') {
            [$locSql, $locParams] = ww_discover_loc_sql('s', $country, $usState);
            if ($viewerId === 0) {
                $parts[] = 'SELECT \'product\' AS kind, p.id AS ref_id, p.created_at
                            FROM store_products p
                            INNER JOIN stores s ON s.id = p.store_id
                            WHERE s.moderation_status = ? AND p.moderation_status = ?' . $locSql;
                $params[] = 'approved';
                $params[] = 'approved';
            } else {
                $parts[] = 'SELECT \'product\' AS kind, p.id AS ref_id, p.created_at
                            FROM store_products p
                            INNER JOIN stores s ON s.id = p.store_id
                            WHERE s.moderation_status = ?
                              AND (
                                p.moderation_status = ?
                                OR (p.moderation_status = ? AND s.user_id = ?)
                              )' . $locSql;
                $params[] = 'approved';
                $params[] = 'approved';
                $params[] = 'pending_approval';
                $params[] = $viewerId;
            }
            foreach ($locParams as $p) {
                $params[] = $p;
            }
            continue;
        }
        if ($kind === 'store') {
            [$locSql, $locParams] = ww_discover_loc_sql('s', $country, $usState);
            $parts[] = 'SELECT \'store\' AS kind, s.id AS ref_id, s.created_at
                        FROM stores s
                        WHERE s.moderation_status = ?' . $locSql;
            $params[] = 'approved';
            foreach ($locParams as $p) {
                $params[] = $p;
            }
            continue;
        }
        if ($kind === 'directory') {
            [$locSql, $locParams] = ww_discover_loc_sql('d', $country, $usState);
            $parts[] = 'SELECT \'directory\' AS kind, d.id AS ref_id, d.created_at
                        FROM directory_entries d
                        WHERE d.moderation_status = ?' . $locSql;
            $params[] = 'approved';
            foreach ($locParams as $p) {
                $params[] = $p;
            }
        }
    }

    if ($parts === []) {
        return ['SELECT NULL AS kind, 0 AS ref_id, NOW() AS created_at WHERE 1 = 0', []];
    }

    $sql = 'SELECT kind, ref_id, created_at FROM (' . implode(' UNION ALL ', $parts) . ') AS feed
            ORDER BY created_at DESC, ref_id DESC';

    return [$sql, $params];
}

/**
 * @param array<string, mixed> $r
 * @return array<string, mixed>
 */
function ww_discover_listing_row(array $r): array
{
    return [
        'id' => (int) $r['id'],
        'title' => (string) $r['title'],
        'price_amount' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
        'is_featured' => (int) ($r['is_featured'] ?? 0) === 1,
        'is_urgent' => (int) ($r['is_urgent'] ?? 0) === 1,
        'is_verified' => (int) ($r['is_verified'] ?? 0) === 1,
        'pricing_type' => (string) $r['pricing_type'],
        'currency' => (string) $r['currency'],
        'media_url' => $r['media_url'] ? (string) $r['media_url'] : null,
        'location_country_name' => $r['location_country_name'] ? (string) $r['location_country_name'] : null,
        'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
        'created_at' => (string) $r['created_at'],
    ];
}

try {
    $kinds = ww_discover_kinds($section);
    // Category filter applies to listings only — drop products/stores/directory when filtering.
    if ($categoryId > 0) {
        $kinds = array_values(array_filter(
            $kinds,
            static fn (string $k): bool => in_array($k, ['service', 'classified', 'community'], true)
        ));
        if ($kinds === []) {
            $kinds = ['classified'];
        }
    }
    [$indexSql, $indexParams] = ww_discover_index_sql($kinds, $country, $usState, $viewerId, $categoryId);
    $fetchLimit = $limit + 1;
    $pageSql = $indexSql . ' LIMIT ' . (int) $fetchLimit . ' OFFSET ' . (int) $offset;
    $st = $pdo->prepare($pageSql);
    $st->execute($indexParams);
    $indexRows = $st->fetchAll(PDO::FETCH_ASSOC);

    $hasMore = count($indexRows) > $limit;
    if ($hasMore) {
        $indexRows = array_slice($indexRows, 0, $limit);
    }

    $idsByKind = [
        'service' => [],
        'classified' => [],
        'community' => [],
        'product' => [],
        'store' => [],
        'directory' => [],
    ];
    foreach ($indexRows as $row) {
        $k = (string) $row['kind'];
        if (isset($idsByKind[$k])) {
            $idsByKind[$k][] = (int) $row['ref_id'];
        }
    }

    $listingsById = [];
    $listingIds = array_values(array_unique(array_merge(
        $idsByKind['service'],
        $idsByKind['classified'],
        $idsByKind['community']
    )));
    if ($listingIds !== []) {
        $ph = implode(',', array_fill(0, count($listingIds), '?'));
        $st = $pdo->prepare(
            "SELECT l.id, l.title, l.price_amount, l.pricing_type, l.currency, l.media_url,
                    l.is_featured, l.is_urgent, l.is_verified,
                    l.location_country_name, l.location_us_state, l.created_at
             FROM listings l
             WHERE l.id IN ($ph)"
        );
        $st->execute($listingIds);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $listingsById[(int) $r['id']] = ww_discover_listing_row($r);
        }
    }

    $productsById = [];
    if ($idsByKind['product'] !== []) {
        $ph = implode(',', array_fill(0, count($idsByKind['product']), '?'));
        $st = $pdo->prepare(
            "SELECT p.id, p.name, p.price_amount, p.currency, p.image_url, p.created_at,
                    s.name AS store_name, s.location_country_name, s.location_us_state
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id IN ($ph)"
        );
        $st->execute($idsByKind['product']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $productsById[(int) $r['id']] = [
                'id' => (int) $r['id'],
                'name' => (string) $r['name'],
                'price_amount' => (string) $r['price_amount'],
                'currency' => (string) $r['currency'],
                'image_url' => $r['image_url'] ? (string) $r['image_url'] : null,
                'store_name' => (string) $r['store_name'],
                'location_country_name' => (string) $r['location_country_name'],
                'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
                'created_at' => (string) $r['created_at'],
            ];
        }
    }

    $storesById = [];
    if ($idsByKind['store'] !== []) {
        $ph = implode(',', array_fill(0, count($idsByKind['store']), '?'));
        $st = $pdo->prepare(
            "SELECT s.id, s.name, s.sells_summary, s.logo_url, s.location_country_name,
                    s.location_us_state, s.created_at
             FROM stores s
             WHERE s.id IN ($ph)"
        );
        $st->execute($idsByKind['store']);
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $storesById[(int) $r['id']] = [
                'id' => (int) $r['id'],
                'name' => (string) $r['name'],
                'sells_summary' => (string) $r['sells_summary'],
                'logo_url' => (string) $r['logo_url'],
                'location_country_name' => (string) $r['location_country_name'],
                'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
                'created_at' => (string) $r['created_at'],
            ];
        }
    }

    $dirsById = [];
    if ($idsByKind['directory'] !== []) {
        $ph = implode(',', array_fill(0, count($idsByKind['directory']), '?'));
        $st = $pdo->prepare(
            "SELECT d.id, d.business_name, d.tagline, d.category, d.city, d.location_us_state,
                    d.location_country_name, d.logo_url, d.created_at
             FROM directory_entries d
             WHERE d.id IN ($ph)"
        );
        $st->execute($idsByKind['directory']);
        $cats = ww_directory_categories();
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $slug = (string) $r['category'];
            $dirsById[(int) $r['id']] = [
                'id' => (int) $r['id'],
                'business_name' => (string) $r['business_name'],
                'tagline' => $r['tagline'] ? (string) $r['tagline'] : null,
                'category_label' => $cats[$slug] ?? $slug,
                'city' => (string) $r['city'],
                'location_us_state' => $r['location_us_state'] ? (string) $r['location_us_state'] : null,
                'location_country_name' => (string) $r['location_country_name'],
                'logo_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
                'created_at' => (string) $r['created_at'],
            ];
        }
    }

    $items = [];
    foreach ($indexRows as $row) {
        $kind = (string) $row['kind'];
        $id = (int) $row['ref_id'];
        $created = (string) $row['created_at'];
        if (in_array($kind, ['service', 'classified', 'community'], true)) {
            if (!isset($listingsById[$id])) {
                continue;
            }
            $items[] = [
                'kind' => $kind,
                'listing' => $listingsById[$id],
                'created_at' => $created,
            ];
            continue;
        }
        if ($kind === 'product') {
            if (!isset($productsById[$id])) {
                continue;
            }
            $items[] = [
                'kind' => 'product',
                'product' => $productsById[$id],
                'created_at' => $created,
            ];
            continue;
        }
        if ($kind === 'store') {
            if (!isset($storesById[$id])) {
                continue;
            }
            $items[] = [
                'kind' => 'store',
                'store' => $storesById[$id],
                'created_at' => $created,
            ];
            continue;
        }
        if ($kind === 'directory') {
            if (!isset($dirsById[$id])) {
                continue;
            }
            $items[] = [
                'kind' => 'directory',
                'entry' => $dirsById[$id],
                'created_at' => $created,
            ];
        }
    }

    ww_json([
        'ok' => true,
        'section' => $section,
        'limit' => $limit,
        'offset' => $offset,
        'has_more' => $hasMore,
        'items' => $items,
    ]);
} catch (Throwable) {
    ww_json(['ok' => false, 'error' => 'Feed unavailable'], 500);
}

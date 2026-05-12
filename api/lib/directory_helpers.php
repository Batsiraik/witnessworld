<?php

declare(strict_types=1);

/**
 * @return array<int, array{id:int, name:string, slug:string}> active categories sorted by sort_order
 */
function ww_directory_categories_db(PDO $pdo): array
{
    $st = $pdo->query(
        'SELECT id, name, slug FROM directory_categories WHERE is_active = 1 ORDER BY sort_order, name'
    );
    return $st ? $st->fetchAll(PDO::FETCH_ASSOC) : [];
}

/**
 * @return array<string, string> slug => label  (legacy helper kept for admin views that still use slugs)
 */
function ww_directory_categories(): array
{
    return [
        'food_drink' => 'Food & drink',
        'retail' => 'Retail & shopping',
        'health_wellness' => 'Health & wellness',
        'professional' => 'Professional services',
        'home_garden' => 'Home & garden',
        'auto' => 'Auto & transport',
        'beauty' => 'Beauty & personal care',
        'education' => 'Education & training',
        'tech' => 'Technology & IT',
        'other' => 'Other',
    ];
}

function ww_directory_category_valid(string $slug): bool
{
    return array_key_exists($slug, ww_directory_categories());
}

function ww_directory_category_id_valid(PDO $pdo, int $catId): bool
{
    $st = $pdo->prepare('SELECT id FROM directory_categories WHERE id = ? AND is_active = 1 LIMIT 1');
    $st->execute([$catId]);
    return (bool) $st->fetch();
}

function ww_directory_user_upload_prefix(int $userId): string
{
    $base = rtrim(defined('WW_PUBLIC_BASE') ? (string) WW_PUBLIC_BASE : '', '/');

    return $base . '/uploads/directory_logos/' . $userId . '/';
}

function ww_directory_logo_url_belongs_to_user(string $url, int $userId): bool
{
    $url = trim($url);
    if ($url === '') {
        return false;
    }

    return str_starts_with($url, ww_directory_user_upload_prefix($userId));
}

/** @param non-empty-string $url */
function ww_directory_http_url_ok(string $url, int $maxLen = 500): bool
{
    if (strlen($url) > $maxLen) {
        return false;
    }
    if (!preg_match('#^https?://#i', $url)) {
        return false;
    }

    return filter_var($url, FILTER_VALIDATE_URL) !== false;
}

<?php

declare(strict_types=1);

function ww_normalize_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone) ?? '';
}

/**
 * Remove a previously stored avatar file under uploads/avatars only (basename match).
 */
function ww_delete_local_avatar_file(?string $avatarUrl): void
{
    if ($avatarUrl === null || $avatarUrl === '') {
        return;
    }
    $path = parse_url($avatarUrl, PHP_URL_PATH);
    if (!is_string($path) || $path === '') {
        return;
    }
    if (!str_contains($path, '/uploads/avatars/')) {
        return;
    }
    $name = basename($path);
    if ($name === '' || $name === '.' || $name === '..') {
        return;
    }
    $dir = dirname(__DIR__, 2) . '/uploads/avatars';
    $base = realpath($dir);
    if ($base === false) {
        return;
    }
    $file = $base . DIRECTORY_SEPARATOR . $name;
    $real = realpath($file);
    if ($real === false || !str_starts_with($real, $base) || !is_file($real)) {
        return;
    }
    @unlink($real);
}

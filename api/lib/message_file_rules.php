<?php

declare(strict_types=1);

/** Max upload size for chat attachments (15 MB). */
function ww_message_attachment_max_bytes(): int
{
    return 15 * 1024 * 1024;
}

/**
 * Declared MIME from client / finfo → safe extension (lowercase, no dot).
 *
 * @return array{ext: string, mime: string}|null
 */
function ww_message_attachment_resolve_type(string $declaredMime, ?string $originalName): ?array
{
    $declaredMime = strtolower(trim($declaredMime));
    $byMime = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'text/plain' => 'txt',
    ];

    if (isset($byMime[$declaredMime])) {
        return ['ext' => $byMime[$declaredMime], 'mime' => $declaredMime];
    }

    $extFromName = strtolower(pathinfo($originalName ?: '', PATHINFO_EXTENSION));
    $byExt = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif', 'webp' => 'image/webp', 'pdf' => 'application/pdf',
        'doc' => 'application/msword', 'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls' => 'application/vnd.ms-excel', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt' => 'text/plain',
    ];
    if ($extFromName !== '' && isset($byExt[$extFromName])) {
        return ['ext' => $extFromName === 'jpeg' ? 'jpg' : $extFromName, 'mime' => $byExt[$extFromName]];
    }

    return null;
}

/**
 * Images only (for Customer Support messages from members).
 *
 * @return array{ext: string, mime: string}|null
 */
function ww_message_attachment_resolve_image_only(string $declaredMime, ?string $originalName): ?array
{
    $declaredMime = strtolower(trim($declaredMime));
    $byMime = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    if (isset($byMime[$declaredMime])) {
        return ['ext' => $byMime[$declaredMime], 'mime' => $declaredMime];
    }

    $extFromName = strtolower(pathinfo($originalName ?: '', PATHINFO_EXTENSION));
    $byExt = [
        'jpg' => 'image/jpeg', 'jpeg' => 'image/jpeg', 'png' => 'image/png',
        'gif' => 'image/gif', 'webp' => 'image/webp',
    ];
    if ($extFromName !== '' && isset($byExt[$extFromName])) {
        return ['ext' => $extFromName === 'jpeg' ? 'jpg' : $extFromName, 'mime' => $byExt[$extFromName]];
    }

    return null;
}

/**
 * Safe original file name for DB display (basename, strip control chars).
 */
function ww_message_attachment_safe_original_name(string $name): string
{
    $name = basename(str_replace(["\0", "\r", "\n"], '', $name));
    if ($name === '' || $name === '.' || $name === '..') {
        return 'file';
    }
    if (mb_strlen($name) > 220) {
        $name = mb_substr($name, 0, 220);
    }

    return $name;
}

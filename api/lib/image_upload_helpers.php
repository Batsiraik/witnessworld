<?php

declare(strict_types=1);

/**
 * Robust image MIME / extension detection for uploads.
 * Handles finfo quirks, alias types (image/x-png, image/jpg), and client mismatches.
 *
 * @return array{mime: string, ext: string}|null
 */
function ww_image_upload_detect(string $tmpPath, string $clientMime = '', string $originalName = ''): ?array
{
    $aliases = [
        'image/jpeg' => 'jpg',
        'image/jpg' => 'jpg',
        'image/pjpeg' => 'jpg',
        'image/png' => 'png',
        'image/x-png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    $normalize = static function (string $mime) use ($aliases): ?array {
        $mime = strtolower(trim($mime));
        if ($mime === '' || !isset($aliases[$mime])) {
            return null;
        }
        $canonical = match ($aliases[$mime]) {
            'jpg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'gif' => 'image/gif',
            default => $mime,
        };

        return ['mime' => $canonical, 'ext' => $aliases[$mime]];
    };

    // 1) Magic bytes via finfo
    if (is_file($tmpPath) && class_exists('finfo')) {
        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $detected = is_object($finfo) ? (string) $finfo->file($tmpPath) : '';
        $hit = $normalize($detected);
        if ($hit !== null) {
            return $hit;
        }
    }

    // 2) getimagesize (more reliable for some PNGs / progressive JPEGs)
    if (is_file($tmpPath)) {
        $info = @getimagesize($tmpPath);
        if (is_array($info) && isset($info[2])) {
            $fromType = match ((int) $info[2]) {
                IMAGETYPE_JPEG => 'image/jpeg',
                IMAGETYPE_PNG => 'image/png',
                IMAGETYPE_WEBP => 'image/webp',
                IMAGETYPE_GIF => 'image/gif',
                default => '',
            };
            $hit = $normalize($fromType);
            if ($hit !== null) {
                return $hit;
            }
        }
        if (is_array($info) && !empty($info['mime'])) {
            $hit = $normalize((string) $info['mime']);
            if ($hit !== null) {
                return $hit;
            }
        }
    }

    // 3) Client-declared MIME
    $hit = $normalize($clientMime);
    if ($hit !== null) {
        return $hit;
    }

    // 4) Filename extension last resort
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    $fromExt = match ($ext) {
        'jpg', 'jpeg' => 'image/jpeg',
        'png' => 'image/png',
        'webp' => 'image/webp',
        'gif' => 'image/gif',
        default => '',
    };

    return $normalize($fromExt);
}

/**
 * @param list<string> $allowedExts e.g. ['jpg','png','webp']
 * @return array{mime: string, ext: string}|null
 */
function ww_image_upload_detect_allowed(
    string $tmpPath,
    array $allowedExts,
    string $clientMime = '',
    string $originalName = ''
): ?array {
    $detected = ww_image_upload_detect($tmpPath, $clientMime, $originalName);
    if ($detected === null) {
        return null;
    }
    $allowed = array_map('strtolower', $allowedExts);
    if (!in_array($detected['ext'], $allowed, true)) {
        return null;
    }

    return $detected;
}

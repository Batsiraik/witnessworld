<?php

declare(strict_types=1);

/**
 * Analytics helpers — unique views per viewer_key + subject/module + calendar day.
 */

/** @return list<string> */
function ww_analytics_subject_types(): array
{
    return ['listing', 'store', 'product', 'directory_entry', 'member'];
}

/** @return list<string> */
function ww_analytics_module_keys(): array
{
    return ['services', 'classifieds', 'community', 'products', 'stores', 'directory', 'discover', 'home'];
}

function ww_analytics_normalize_viewer_key(?int $viewerUserId, string $deviceId): string
{
    if ($viewerUserId !== null && $viewerUserId > 0) {
        return 'u:' . $viewerUserId;
    }
    $deviceId = preg_replace('/[^a-zA-Z0-9_\-.:]/', '', $deviceId) ?? '';
    if (strlen($deviceId) < 8) {
        return '';
    }
    if (strlen($deviceId) > 64) {
        $deviceId = substr($deviceId, 0, 64);
    }

    return 'd:' . $deviceId;
}

/**
 * Resolve content owner user id (for denormalized owner stats + self-view skip).
 */
function ww_analytics_resolve_owner(PDO $pdo, string $subjectType, int $subjectId): ?int
{
    if ($subjectId <= 0) {
        return null;
    }
    try {
        if ($subjectType === 'listing') {
            $st = $pdo->prepare('SELECT user_id FROM listings WHERE id = ? LIMIT 1');
            $st->execute([$subjectId]);
            $v = $st->fetchColumn();

            return $v !== false ? (int) $v : null;
        }
        if ($subjectType === 'store') {
            $st = $pdo->prepare('SELECT user_id FROM stores WHERE id = ? LIMIT 1');
            $st->execute([$subjectId]);
            $v = $st->fetchColumn();

            return $v !== false ? (int) $v : null;
        }
        if ($subjectType === 'product') {
            $st = $pdo->prepare(
                'SELECT s.user_id FROM store_products p INNER JOIN stores s ON s.id = p.store_id WHERE p.id = ? LIMIT 1'
            );
            $st->execute([$subjectId]);
            $v = $st->fetchColumn();

            return $v !== false ? (int) $v : null;
        }
        if ($subjectType === 'directory_entry') {
            $st = $pdo->prepare('SELECT user_id FROM directory_entries WHERE id = ? LIMIT 1');
            $st->execute([$subjectId]);
            $v = $st->fetchColumn();

            return $v !== false ? (int) $v : null;
        }
        if ($subjectType === 'member') {
            $st = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
            $st->execute([$subjectId]);
            $v = $st->fetchColumn();

            return $v !== false ? (int) $v : null;
        }
    } catch (Throwable) {
        return null;
    }

    return null;
}

/**
 * Record a unique content view. Returns whether a new row was inserted.
 *
 * @return array{ok: bool, counted: bool, reason?: string}
 */
function ww_analytics_track_content(
    PDO $pdo,
    string $subjectType,
    int $subjectId,
    ?int $viewerUserId,
    string $deviceId,
    ?string $source = null
): array {
    $subjectType = strtolower(trim($subjectType));
    if (!in_array($subjectType, ww_analytics_subject_types(), true) || $subjectId <= 0) {
        return ['ok' => false, 'counted' => false, 'reason' => 'invalid_subject'];
    }

    $viewerKey = ww_analytics_normalize_viewer_key($viewerUserId, $deviceId);
    if ($viewerKey === '') {
        return ['ok' => false, 'counted' => false, 'reason' => 'device_id_required'];
    }

    $ownerId = ww_analytics_resolve_owner($pdo, $subjectType, $subjectId);
    if ($ownerId === null) {
        return ['ok' => false, 'counted' => false, 'reason' => 'not_found'];
    }

    // Don't count owners viewing their own content / profile.
    if ($viewerUserId !== null && $viewerUserId > 0 && $viewerUserId === $ownerId) {
        return ['ok' => true, 'counted' => false, 'reason' => 'self_view'];
    }

    $source = $source !== null ? trim($source) : null;
    if ($source === '') {
        $source = null;
    }
    if ($source !== null && strlen($source) > 64) {
        $source = substr($source, 0, 64);
    }

    try {
        $st = $pdo->prepare(
            'INSERT IGNORE INTO content_views
             (subject_type, subject_id, owner_user_id, viewer_user_id, viewer_key, view_date, source)
             VALUES (?, ?, ?, ?, ?, CURDATE(), ?)'
        );
        $st->execute([
            $subjectType,
            $subjectId,
            $ownerId,
            $viewerUserId !== null && $viewerUserId > 0 ? $viewerUserId : null,
            $viewerKey,
            $source,
        ]);

        return ['ok' => true, 'counted' => $st->rowCount() > 0];
    } catch (Throwable) {
        return ['ok' => false, 'counted' => false, 'reason' => 'db_error'];
    }
}

/**
 * Record a unique module open.
 *
 * @return array{ok: bool, counted: bool, reason?: string}
 */
function ww_analytics_track_module(
    PDO $pdo,
    string $moduleKey,
    ?int $viewerUserId,
    string $deviceId,
    ?string $source = null
): array {
    $moduleKey = strtolower(trim($moduleKey));
    if (!in_array($moduleKey, ww_analytics_module_keys(), true)) {
        return ['ok' => false, 'counted' => false, 'reason' => 'invalid_module'];
    }

    $viewerKey = ww_analytics_normalize_viewer_key($viewerUserId, $deviceId);
    if ($viewerKey === '') {
        return ['ok' => false, 'counted' => false, 'reason' => 'device_id_required'];
    }

    $source = $source !== null ? trim($source) : null;
    if ($source === '') {
        $source = null;
    }
    if ($source !== null && strlen($source) > 64) {
        $source = substr($source, 0, 64);
    }

    try {
        $st = $pdo->prepare(
            'INSERT IGNORE INTO module_views
             (module_key, viewer_user_id, viewer_key, view_date, source)
             VALUES (?, ?, ?, CURDATE(), ?)'
        );
        $st->execute([
            $moduleKey,
            $viewerUserId !== null && $viewerUserId > 0 ? $viewerUserId : null,
            $viewerKey,
            $source,
        ]);

        return ['ok' => true, 'counted' => $st->rowCount() > 0];
    } catch (Throwable) {
        return ['ok' => false, 'counted' => false, 'reason' => 'db_error'];
    }
}

/**
 * Count views for a subject (optionally since date Y-m-d inclusive).
 */
function ww_analytics_subject_view_count(PDO $pdo, string $subjectType, int $subjectId, ?string $sinceDate = null): int
{
    try {
        if ($sinceDate !== null && $sinceDate !== '') {
            $st = $pdo->prepare(
                'SELECT COUNT(*) FROM content_views
                 WHERE subject_type = ? AND subject_id = ? AND view_date >= ?'
            );
            $st->execute([$subjectType, $subjectId, $sinceDate]);
        } else {
            $st = $pdo->prepare(
                'SELECT COUNT(*) FROM content_views WHERE subject_type = ? AND subject_id = ?'
            );
            $st->execute([$subjectType, $subjectId]);
        }
        return (int) $st->fetchColumn();
    } catch (Throwable) {
        return 0;
    }
}

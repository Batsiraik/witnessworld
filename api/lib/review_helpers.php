<?php

declare(strict_types=1);

/**
 * @return array{average: ?float, count: int}
 */
function ww_review_summary(PDO $pdo, string $subjectType, int $subjectId): array
{
    if ($subjectType === 'store') {
        $st = $pdo->prepare(
            'SELECT COUNT(*) AS c, AVG(r.rating) AS avg_rating
             FROM content_reviews r
             LEFT JOIN store_products p ON r.subject_type = \'product\' AND p.id = r.subject_id
             WHERE r.status = ?
               AND ((r.subject_type = ? AND r.subject_id = ?) OR p.store_id = ?)'
        );
        $st->execute(['published', 'store', $subjectId, $subjectId]);
        $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
        $count = (int) ($r['c'] ?? 0);
        return [
            'average' => $count > 0 ? round((float) $r['avg_rating'], 1) : null,
            'count' => $count,
        ];
    }

    $st = $pdo->prepare(
        'SELECT COUNT(*) AS c, AVG(rating) AS avg_rating
         FROM content_reviews
         WHERE subject_type = ? AND subject_id = ? AND status = ?'
    );
    $st->execute([$subjectType, $subjectId, 'published']);
    $r = $st->fetch(PDO::FETCH_ASSOC) ?: [];
    $count = (int) ($r['c'] ?? 0);
    return [
        'average' => $count > 0 ? round((float) $r['avg_rating'], 1) : null,
        'count' => $count,
    ];
}

/**
 * @return list<array<string, mixed>>
 */
function ww_review_recent(PDO $pdo, string $subjectType, int $subjectId, int $limit = 5): array
{
    $limit = max(1, min(20, $limit));
    if ($subjectType === 'store') {
        $st = $pdo->prepare(
            'SELECT r.id, r.rating, r.title, r.body, r.created_at,
                    u.username, u.first_name, u.last_name, u.avatar_url
             FROM content_reviews r
             INNER JOIN users u ON u.id = r.reviewer_user_id
             LEFT JOIN store_products p ON r.subject_type = \'product\' AND p.id = r.subject_id
             WHERE r.status = ?
               AND ((r.subject_type = ? AND r.subject_id = ?) OR p.store_id = ?)
             ORDER BY r.id DESC
             LIMIT ' . $limit
        );
        $st->execute(['published', 'store', $subjectId, $subjectId]);
    } else {
    $st = $pdo->prepare(
        'SELECT r.id, r.rating, r.title, r.body, r.created_at,
                u.username, u.first_name, u.last_name, u.avatar_url
         FROM content_reviews r
         INNER JOIN users u ON u.id = r.reviewer_user_id
         WHERE r.subject_type = ? AND r.subject_id = ? AND r.status = ?
         ORDER BY r.id DESC
         LIMIT ' . $limit
    );
    $st->execute([$subjectType, $subjectId, 'published']);
    }
    $out = [];
    foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
        $label = trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? ''));
        if ($label === '') {
            $label = (string) ($r['username'] ?? 'Member');
        }
        $out[] = [
            'id' => (int) $r['id'],
            'rating' => (int) $r['rating'],
            'title' => $r['title'] ? (string) $r['title'] : null,
            'body' => $r['body'] ? (string) $r['body'] : null,
            'created_at' => (string) $r['created_at'],
            'reviewer_label' => $label,
            'reviewer_username' => (string) ($r['username'] ?? ''),
            'reviewer_avatar_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
        ];
    }
    return $out;
}

/**
 * @return array{summary: array{average:?float,count:int}, reviews:list<array<string,mixed>>}
 */
function ww_reviews_payload(PDO $pdo, string $subjectType, int $subjectId): array
{
    return [
        'summary' => ww_review_summary($pdo, $subjectType, $subjectId),
        'reviews' => ww_review_recent($pdo, $subjectType, $subjectId, 5),
    ];
}

/**
 * Resolve the provider / seller user id for a public review subject (approved content only).
 *
 * @throws RuntimeException when the subject is missing or not visible
 */
function ww_review_resolve_seller_user_id(PDO $pdo, string $subjectType, int $subjectId): int
{
    if ($subjectType === 'listing') {
        $st = $pdo->prepare('SELECT user_id FROM listings WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Listing not found');
        }
        return (int) $r['user_id'];
    }

    if ($subjectType === 'product') {
        $st = $pdo->prepare(
            'SELECT s.user_id
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved', 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Product not found');
        }
        return (int) $r['user_id'];
    }

    if ($subjectType === 'store') {
        $st = $pdo->prepare('SELECT user_id FROM stores WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Store not found');
        }
        return (int) $r['user_id'];
    }

    if ($subjectType === 'directory_entry') {
        $st = $pdo->prepare('SELECT user_id FROM directory_entries WHERE id = ? AND moderation_status = ? LIMIT 1');
        $st->execute([$subjectId, 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Business listing not found');
        }
        return (int) $r['user_id'];
    }

    if ($subjectType === 'member') {
        $st = $pdo->prepare('SELECT id FROM users WHERE id = ? AND status = ? LIMIT 1');
        $st->execute([$subjectId, 'verified']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Member not found');
        }
        return (int) $r['id'];
    }

    throw new RuntimeException('Invalid review subject');
}

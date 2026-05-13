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

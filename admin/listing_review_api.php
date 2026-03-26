<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/push_triggers.php';

header('Content-Type: application/json; charset=utf-8');

$pdo = witnessworld_pdo();
$adminId = (int) ($_SESSION['admin_id'] ?? 0);

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $id = (int) ($_GET['id'] ?? 0);
    if ($id <= 0) {
        echo json_encode(['ok' => false, 'error' => 'Invalid id']);
        exit;
    }
    $st = $pdo->prepare(
        'SELECT l.*, u.email, u.first_name, u.last_name, u.username, u.status AS user_status,
                a.name AS reviewer_name
         FROM listings l
         INNER JOIN users u ON u.id = l.user_id
         LEFT JOIN admins a ON a.id = l.reviewed_by_admin_id
         WHERE l.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $listing = $st->fetch(PDO::FETCH_ASSOC);
    if (!$listing) {
        echo json_encode(['ok' => false, 'error' => 'Not found']);
        exit;
    }

    $portfolioUrls = [];
    if (!empty($listing['portfolio_urls_json'])) {
        $decoded = json_decode((string) $listing['portfolio_urls_json'], true);
        if (is_array($decoded)) {
            foreach ($decoded as $u) {
                if (is_string($u) && $u !== '') {
                    $portfolioUrls[] = $u;
                }
            }
        }
    }

    $softSkills = [];
    if (!empty($listing['soft_skills_json'])) {
        $decSkills = json_decode((string) $listing['soft_skills_json'], true);
        if (is_array($decSkills)) {
            foreach ($decSkills as $s) {
                if (is_string($s) && $s !== '') {
                    $softSkills[] = $s;
                }
            }
        }
    }

    $cn = trim((string) ($listing['location_country_name'] ?? ''));
    $cc = trim((string) ($listing['location_country_code'] ?? ''));
    $usState = trim((string) ($listing['location_us_state'] ?? ''));
    $locLine = '';
    if ($cn !== '' || $cc !== '') {
        $locLine = $cn !== '' ? $cn : $cc;
        if ($usState !== '') {
            $locLine .= ' · ' . $usState;
        }
    }

    $status = (string) ($listing['moderation_status'] ?? '');

    echo json_encode([
        'ok' => true,
        'listing' => $listing,
        'portfolio_urls' => $portfolioUrls,
        'soft_skills' => $softSkills,
        'loc_line' => $locLine,
        'status' => $status,
        'seller' => [
            'user_id' => (int) $listing['user_id'],
            'first_name' => (string) $listing['first_name'],
            'last_name' => (string) $listing['last_name'],
            'username' => (string) $listing['username'],
            'email' => (string) $listing['email'],
            'user_status' => (string) $listing['user_status'],
        ],
        'reviewer_name' => $listing['reviewer_name'] ? (string) $listing['reviewer_name'] : null,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input') ?: '';
$input = json_decode($raw, true);
if (!is_array($input)) {
    echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
    exit;
}

$id = (int) ($input['id'] ?? 0);
$action = (string) ($input['action'] ?? '');
$note = trim((string) ($input['admin_note'] ?? ''));

if ($id <= 0) {
    echo json_encode(['ok' => false, 'error' => 'Invalid id']);
    exit;
}

try {
    $st = $pdo->prepare(
        'SELECT l.id, l.moderation_status, l.user_id, l.title, l.listing_type FROM listings l WHERE l.id = ? LIMIT 1'
    );
    $st->execute([$id]);
    $row = $st->fetch(PDO::FETCH_ASSOC);
    if (!$row) {
        echo json_encode(['ok' => false, 'error' => 'Not found']);
        exit;
    }

    $now = date('Y-m-d H:i:s');
    if ($action === 'approve') {
        $pdo->prepare(
            'UPDATE listings SET moderation_status = ?, admin_note = NULL, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
        )->execute(['approved', $now, $adminId > 0 ? $adminId : null, $id]);
        ww_admin_notify_listing_review(
            $pdo,
            (int) $row['user_id'],
            'approve',
            (string) $row['listing_type'],
            (string) $row['title']
        );
    } elseif ($action === 'reject') {
        $pdo->prepare(
            'UPDATE listings SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
        )->execute(['rejected', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
        ww_admin_notify_listing_review(
            $pdo,
            (int) $row['user_id'],
            'reject',
            (string) $row['listing_type'],
            (string) $row['title']
        );
    } elseif ($action === 'remove') {
        $pdo->prepare(
            'UPDATE listings SET moderation_status = ?, admin_note = ?, reviewed_at = ?, reviewed_by_admin_id = ? WHERE id = ?'
        )->execute(['removed', $note !== '' ? $note : null, $now, $adminId > 0 ? $adminId : null, $id]);
    } elseif ($action === 'reopen') {
        $pdo->prepare(
            'UPDATE listings SET moderation_status = ?, admin_note = NULL, reviewed_at = NULL, reviewed_by_admin_id = NULL WHERE id = ?'
        )->execute(['pending_approval', $id]);
    } else {
        echo json_encode(['ok' => false, 'error' => 'Unknown action']);
        exit;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Server error']);
    exit;
}

echo json_encode(['ok' => true]);

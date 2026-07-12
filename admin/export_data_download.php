<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/registration_poll_labels.php';

$period = strtolower(trim((string) ($_GET['period'] ?? 'month')));
if (!in_array($period, ['day', 'week', 'month'], true)) {
    $period = 'month';
}

$anchorRaw = trim((string) ($_GET['date'] ?? ''));
$anchor = DateTimeImmutable::createFromFormat('!Y-m-d', $anchorRaw !== '' ? $anchorRaw : date('Y-m-d'));
if (!$anchor) {
    $anchor = new DateTimeImmutable('today');
}

[$from, $toExclusive, $rangeSlug] = match ($period) {
    'day' => [
        $anchor->setTime(0, 0, 0),
        $anchor->modify('+1 day')->setTime(0, 0, 0),
        $anchor->format('Y-m-d'),
    ],
    'week' => (static function (DateTimeImmutable $d): array {
        $monday = $d->modify('monday this week')->setTime(0, 0, 0);
        if ((int) $d->format('N') === 7) {
            $monday = $d->modify('monday last week')->setTime(0, 0, 0);
        }
        return [
            $monday,
            $monday->modify('+7 days'),
            $monday->format('Y-m-d') . '_to_' . $monday->modify('+6 days')->format('Y-m-d'),
        ];
    })($anchor),
    default => [
        $anchor->modify('first day of this month')->setTime(0, 0, 0),
        $anchor->modify('first day of next month')->setTime(0, 0, 0),
        $anchor->format('Y-m'),
    ],
};

$pdo = witnessworld_pdo();

$sql = "SELECT
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.created_at,
            u.registration_account_type,
            u.registration_primary_purpose,
            u.registration_wants_account_manager,
            u.registration_referral_source,
            u.registration_referral_other,
            (
              SELECT COUNT(*)
              FROM listings l
              WHERE l.user_id = u.id
                AND l.moderation_status = 'approved'
            ) AS active_listings,
            (
              SELECT GROUP_CONCAT(l.title ORDER BY l.created_at ASC SEPARATOR ' | ')
              FROM listings l
              WHERE l.user_id = u.id
                AND l.moderation_status = 'approved'
            ) AS active_listing_titles
        FROM users u
        WHERE u.created_at >= ?
          AND u.created_at < ?
        ORDER BY u.created_at ASC, u.id ASC";

try {
    $st = $pdo->prepare($sql);
    $st->execute([$from->format('Y-m-d H:i:s'), $toExclusive->format('Y-m-d H:i:s')]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
} catch (Throwable $e) {
    // Older DBs may miss some poll columns — fall back without optional fields.
    $st = $pdo->prepare(
        "SELECT u.id, u.first_name, u.last_name, u.email, u.created_at,
                (
                  SELECT COUNT(*) FROM listings l
                  WHERE l.user_id = u.id AND l.moderation_status = 'approved'
                ) AS active_listings,
                (
                  SELECT GROUP_CONCAT(l.title ORDER BY l.created_at ASC SEPARATOR ' | ')
                  FROM listings l
                  WHERE l.user_id = u.id AND l.moderation_status = 'approved'
                ) AS active_listing_titles
         FROM users u
         WHERE u.created_at >= ? AND u.created_at < ?
         ORDER BY u.created_at ASC, u.id ASC"
    );
    $st->execute([$from->format('Y-m-d H:i:s'), $toExclusive->format('Y-m-d H:i:s')]);
    $rows = $st->fetchAll(PDO::FETCH_ASSOC);
}

$headers = [
    'User Full Name',
    'User Email',
    'Joined',
    'Poll: Individual or Business',
    'Poll: Account manager support',
    'Poll: Primary purpose',
    'Poll: How they heard about WWC',
    'Active Listings',
    'Active Listing Titles',
];

$sheetRows = [];
$sheetRows[] = $headers;
foreach ($rows as $r) {
    $fullName = trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? ''));
    if ($fullName === '') {
        $fullName = '—';
    }
    $joined = (string) ($r['created_at'] ?? '');
    if ($joined !== '') {
        $ts = strtotime($joined);
        if ($ts !== false) {
            $joined = date('Y-m-d H:i', $ts);
        }
    }
    $titles = trim((string) ($r['active_listing_titles'] ?? ''));
    $sheetRows[] = [
        $fullName,
        (string) ($r['email'] ?? ''),
        $joined,
        ww_poll_account_type_label((string) ($r['registration_account_type'] ?? '')),
        ww_poll_account_manager_label((string) ($r['registration_wants_account_manager'] ?? '')),
        ww_poll_primary_purpose_label((string) ($r['registration_primary_purpose'] ?? '')),
        ww_poll_referral_label(
            (string) ($r['registration_referral_source'] ?? ''),
            isset($r['registration_referral_other']) ? (string) $r['registration_referral_other'] : null
        ),
        (string) ((int) ($r['active_listings'] ?? 0)),
        $titles !== '' ? $titles : '—',
    ];
}

/**
 * Build a simple SpreadsheetML workbook Excel can open as .xls.
 *
 * @param list<list<string>> $matrix
 */
function ww_export_excel_xml(array $matrix): string
{
    $esc = static function (string $v): string {
        return htmlspecialchars($v, ENT_QUOTES | ENT_XML1, 'UTF-8');
    };

    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<?mso-application progid="Excel.Sheet"?>' . "\n";
    $xml .= '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"'
        . ' xmlns:o="urn:schemas-microsoft-com:office:office"'
        . ' xmlns:x="urn:schemas-microsoft-com:office:excel"'
        . ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"'
        . ' xmlns:html="http://www.w3.org/TR/REC-html40">' . "\n";
    $xml .= '<Styles>'
        . '<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#E8F4FC" ss:Pattern="Solid"/></Style>'
        . '</Styles>' . "\n";
    $xml .= '<Worksheet ss:Name="Members"><Table>' . "\n";

    foreach ($matrix as $i => $row) {
        $xml .= '<Row>';
        foreach ($row as $cell) {
            $style = $i === 0 ? ' ss:StyleID="Header"' : '';
            $xml .= '<Cell' . $style . '><Data ss:Type="String">' . $esc((string) $cell) . '</Data></Cell>';
        }
        $xml .= '</Row>' . "\n";
    }

    $xml .= '</Table></Worksheet></Workbook>';

    return $xml;
}

$filename = 'wwc-members-' . $period . '-' . $rangeSlug . '.xls';
$payload = ww_export_excel_xml($sheetRows);

header('Content-Type: application/vnd.ms-excel; charset=UTF-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Content-Length: ' . (string) strlen($payload));
echo $payload;
exit;

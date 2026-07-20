<?php

declare(strict_types=1);

require_once __DIR__ . '/includes/guard.php';
require_once __DIR__ . '/includes/registration_poll_labels.php';

$period = strtolower(trim((string) ($_GET['period'] ?? 'month')));
if (!in_array($period, ['all', 'day', 'week', 'month'], true)) {
    $period = 'month';
}

$anchorRaw = trim((string) ($_GET['date'] ?? ''));
$anchor = DateTimeImmutable::createFromFormat('!Y-m-d', $anchorRaw !== '' ? $anchorRaw : date('Y-m-d'));
if (!$anchor) {
    $anchor = new DateTimeImmutable('today');
}

$from = null;
$toExclusive = null;
$rangeSlug = 'all';

if ($period !== 'all') {
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
}

$pdo = witnessworld_pdo();

$selectSql = "SELECT
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
        FROM users u";

$fallbackSql = "SELECT u.id, u.first_name, u.last_name, u.email, u.created_at,
                (
                  SELECT COUNT(*) FROM listings l
                  WHERE l.user_id = u.id AND l.moderation_status = 'approved'
                ) AS active_listings,
                (
                  SELECT GROUP_CONCAT(l.title ORDER BY l.created_at ASC SEPARATOR ' | ')
                  FROM listings l
                  WHERE l.user_id = u.id AND l.moderation_status = 'approved'
                ) AS active_listing_titles
         FROM users u";

$orderSql = ' ORDER BY u.created_at ASC, u.id ASC';

try {
    if ($period === 'all') {
        $rows = $pdo->query($selectSql . $orderSql)->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $st = $pdo->prepare($selectSql . ' WHERE u.created_at >= ? AND u.created_at < ?' . $orderSql);
        $st->execute([$from->format('Y-m-d H:i:s'), $toExclusive->format('Y-m-d H:i:s')]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    }
} catch (Throwable $e) {
    // Older DBs may miss some poll columns — fall back without optional fields.
    if ($period === 'all') {
        $rows = $pdo->query($fallbackSql . $orderSql)->fetchAll(PDO::FETCH_ASSOC);
    } else {
        $st = $pdo->prepare($fallbackSql . ' WHERE u.created_at >= ? AND u.created_at < ?' . $orderSql);
        $st->execute([$from->format('Y-m-d H:i:s'), $toExclusive->format('Y-m-d H:i:s')]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
    }
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
 * Build a real .xlsx (Office Open XML) workbook via ZipArchive.
 *
 * @param list<list<string>> $matrix
 */
function ww_export_xlsx_bytes(array $matrix): string
{
    if (!class_exists(ZipArchive::class)) {
        throw new RuntimeException('ZipArchive extension is required for Excel export.');
    }

    $esc = static function (string $v): string {
        return htmlspecialchars($v, ENT_QUOTES | ENT_XML1, 'UTF-8');
    };

    $colLetter = static function (int $index): string {
        // 0-based → A, B, … Z, AA…
        $n = $index + 1;
        $s = '';
        while ($n > 0) {
            $n--;
            $s = chr(65 + ($n % 26)) . $s;
            $n = intdiv($n, 26);
        }

        return $s;
    };

    $sheetXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
        . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        . '<sheetData>';

    foreach ($matrix as $rIdx => $row) {
        $rowNum = $rIdx + 1;
        $sheetXml .= '<row r="' . $rowNum . '">';
        foreach ($row as $cIdx => $value) {
            $ref = $colLetter($cIdx) . $rowNum;
            $isHeader = $rIdx === 0;
            $style = $isHeader ? ' s="1"' : '';
            // Inline string (t="inlineStr") avoids a sharedStrings table.
            $sheetXml .= '<c r="' . $ref . '" t="inlineStr"' . $style . '>'
                . '<is><t>' . $esc((string) $value) . '</t></is>'
                . '</c>';
        }
        $sheetXml .= '</row>';
    }
    $sheetXml .= '</sheetData></worksheet>';

    $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        . '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        . '<Default Extension="xml" ContentType="application/xml"/>'
        . '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
        . '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
        . '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
        . '</Types>';

    $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
        . '</Relationships>';

    $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"'
        . ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
        . '<sheets><sheet name="Members" sheetId="1" r:id="rId1"/></sheets>'
        . '</workbook>';

    $workbookRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
        . '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
        . '</Relationships>';

    // style xf id 1 = bold header
    $styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        . '<fonts count="2">'
        . '<font><sz val="11"/><name val="Calibri"/></font>'
        . '<font><b/><sz val="11"/><name val="Calibri"/></font>'
        . '</fonts>'
        . '<fills count="2">'
        . '<fill><patternFill patternType="none"/></fill>'
        . '<fill><patternFill patternType="gray125"/></fill>'
        . '</fills>'
        . '<borders count="1"><border/></borders>'
        . '<cellStyleXfs count="1"><xf/></cellStyleXfs>'
        . '<cellXfs count="2">'
        . '<xf xfId="0"/>'
        . '<xf xfId="0" fontId="1" applyFont="1"/>'
        . '</cellXfs>'
        . '</styleSheet>';

    $tmp = tempnam(sys_get_temp_dir(), 'wwx');
    if ($tmp === false) {
        throw new RuntimeException('Could not create temp file for Excel export.');
    }
    $zipPath = $tmp . '.xlsx';
    @unlink($tmp);

    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
        throw new RuntimeException('Could not open ZipArchive for Excel export.');
    }

    $zip->addFromString('[Content_Types].xml', $contentTypes);
    $zip->addFromString('_rels/.rels', $rels);
    $zip->addFromString('xl/workbook.xml', $workbook);
    $zip->addFromString('xl/_rels/workbook.xml.rels', $workbookRels);
    $zip->addFromString('xl/worksheets/sheet1.xml', $sheetXml);
    $zip->addFromString('xl/styles.xml', $styles);
    $zip->close();

    $bytes = file_get_contents($zipPath);
    @unlink($zipPath);
    if ($bytes === false) {
        throw new RuntimeException('Could not read generated Excel file.');
    }

    return $bytes;
}

$filename = 'wwc-members-' . $period . '-' . $rangeSlug . '.xlsx';

try {
    $payload = ww_export_xlsx_bytes($sheetRows);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    echo 'Could not generate Excel file. Ensure the PHP Zip extension is enabled.';
    exit;
}

header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Cache-Control: no-store, no-cache, must-revalidate');
header('Pragma: no-cache');
header('Content-Length: ' . (string) strlen($payload));
echo $payload;
exit;

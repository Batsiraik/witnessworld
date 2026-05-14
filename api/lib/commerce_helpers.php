<?php

declare(strict_types=1);

require_once __DIR__ . '/push_notify.php';
require_once __DIR__ . '/Mailer.php';

/**
 * @return array{seller_user_id:int,title:string,image_url:?string,request_type:string,unit_price:?string,currency:string}
 */
function ww_commerce_subject(PDO $pdo, string $subjectType, int $subjectId): array
{
    if ($subjectType === 'product') {
        $st = $pdo->prepare(
            'SELECT p.name, p.price_amount, p.currency, p.image_url, s.user_id
             FROM store_products p
             INNER JOIN stores s ON s.id = p.store_id
             WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved', 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Product not available');
        }
        return [
            'seller_user_id' => (int) $r['user_id'],
            'title' => (string) $r['name'],
            'image_url' => $r['image_url'] ? (string) $r['image_url'] : null,
            'request_type' => 'product_order',
            'unit_price' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
            'currency' => (string) ($r['currency'] ?: 'USD'),
        ];
    }

    if ($subjectType === 'listing') {
        $st = $pdo->prepare(
            'SELECT user_id, listing_type, title, media_url, price_amount, currency
             FROM listings
             WHERE id = ? AND moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Listing not available');
        }
        $type = (string) ($r['listing_type'] ?? '');
        return [
            'seller_user_id' => (int) $r['user_id'],
            'title' => (string) $r['title'],
            'image_url' => $r['media_url'] ? (string) $r['media_url'] : null,
            'request_type' => $type === 'service' ? 'service_hire' : 'local_meetup',
            'unit_price' => $r['price_amount'] !== null ? (string) $r['price_amount'] : null,
            'currency' => (string) ($r['currency'] ?: 'USD'),
        ];
    }

    if ($subjectType === 'directory_entry') {
        $st = $pdo->prepare(
            'SELECT user_id, business_name, logo_url
             FROM directory_entries
             WHERE id = ? AND moderation_status = ?
             LIMIT 1'
        );
        $st->execute([$subjectId, 'approved']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Business listing not available');
        }
        return [
            'seller_user_id' => (int) $r['user_id'],
            'title' => (string) $r['business_name'],
            'image_url' => $r['logo_url'] ? (string) $r['logo_url'] : null,
            'request_type' => 'directory_hire',
            'unit_price' => null,
            'currency' => 'USD',
        ];
    }

    if ($subjectType === 'member') {
        $st = $pdo->prepare('SELECT id, username, first_name, last_name, avatar_url FROM users WHERE id = ? AND status = ? LIMIT 1');
        $st->execute([$subjectId, 'verified']);
        $r = $st->fetch(PDO::FETCH_ASSOC);
        if (!$r) {
            throw new RuntimeException('Member not available');
        }
        $name = trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? ''));
        if ($name === '') {
            $name = '@' . (string) $r['username'];
        }
        return [
            'seller_user_id' => (int) $r['id'],
            'title' => $name,
            'image_url' => $r['avatar_url'] ? (string) $r['avatar_url'] : null,
            'request_type' => 'member_hire',
            'unit_price' => null,
            'currency' => 'USD',
        ];
    }

    throw new RuntimeException('Invalid request subject');
}

function ww_commerce_event(PDO $pdo, int $requestId, ?int $actorUserId, string $eventType, ?string $note = null): void
{
    $st = $pdo->prepare(
        'INSERT INTO commerce_request_events (request_id, actor_user_id, event_type, note) VALUES (?,?,?,?)'
    );
    $st->execute([$requestId, $actorUserId, $eventType, $note]);
}

/**
 * @param array<string, mixed> $row
 * @return array<string, mixed>
 */
function ww_commerce_row(array $row): array
{
    return [
        'id' => (int) $row['id'],
        'buyer_user_id' => (int) $row['buyer_user_id'],
        'seller_user_id' => (int) $row['seller_user_id'],
        'subject_type' => (string) $row['subject_type'],
        'subject_id' => (int) $row['subject_id'],
        'subject_title' => (string) $row['subject_title'],
        'subject_image_url' => $row['subject_image_url'] ? (string) $row['subject_image_url'] : null,
        'request_type' => (string) $row['request_type'],
        'status' => (string) $row['status'],
        'quantity' => (int) $row['quantity'],
        'unit_price' => $row['unit_price'] !== null ? (string) $row['unit_price'] : null,
        'currency' => (string) $row['currency'],
        'buyer_name' => (string) $row['buyer_name'],
        'buyer_email' => $row['buyer_email'] ? (string) $row['buyer_email'] : null,
        'buyer_phone' => $row['buyer_phone'] ? (string) $row['buyer_phone'] : null,
        'shipping_name' => $row['shipping_name'] ? (string) $row['shipping_name'] : null,
        'shipping_address1' => $row['shipping_address1'] ? (string) $row['shipping_address1'] : null,
        'shipping_address2' => $row['shipping_address2'] ? (string) $row['shipping_address2'] : null,
        'shipping_city' => $row['shipping_city'] ? (string) $row['shipping_city'] : null,
        'shipping_state' => $row['shipping_state'] ? (string) $row['shipping_state'] : null,
        'shipping_postal_code' => $row['shipping_postal_code'] ? (string) $row['shipping_postal_code'] : null,
        'shipping_country' => $row['shipping_country'] ? (string) $row['shipping_country'] : null,
        'project_brief' => $row['project_brief'] ? (string) $row['project_brief'] : null,
        'preferred_contact' => $row['preferred_contact'] ? (string) $row['preferred_contact'] : null,
        'seller_note' => $row['seller_note'] ? (string) $row['seller_note'] : null,
        'tracking_number' => $row['tracking_number'] ? (string) $row['tracking_number'] : null,
        'created_at' => (string) $row['created_at'],
        'updated_at' => (string) $row['updated_at'],
        'buyer_label' => trim((string) ($row['buyer_first_name'] ?? '') . ' ' . (string) ($row['buyer_last_name'] ?? '')),
        'buyer_username' => isset($row['buyer_username']) ? (string) $row['buyer_username'] : null,
        'seller_label' => trim((string) ($row['seller_first_name'] ?? '') . ' ' . (string) ($row['seller_last_name'] ?? '')),
        'seller_username' => isset($row['seller_username']) ? (string) $row['seller_username'] : null,
    ];
}

/**
 * Live subject snapshot for order detail (buyer + seller). Null if subject was removed or not visible.
 *
 * @return array<string, mixed>|null
 */
function ww_commerce_subject_preview(PDO $pdo, string $subjectType, int $subjectId): ?array
{
    $subjectType = strtolower(trim($subjectType));
    $base = [
        'kind' => $subjectType,
        'title' => '',
        'hero_image_url' => null,
        'subtitle' => null,
        'description' => null,
        'specifications' => null,
        'gallery_urls' => [],
        'meta_line' => null,
        'store_name' => null,
    ];

    try {
        if ($subjectType === 'listing') {
            $st = $pdo->prepare(
                'SELECT title, description, media_url, portfolio_urls_json, listing_type, price_amount, is_free, pricing_type, currency
                 FROM listings WHERE id = ? AND moderation_status = ? LIMIT 1'
            );
            $st->execute([$subjectId, 'approved']);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) {
                return null;
            }
            $base['title'] = (string) $r['title'];
            $base['hero_image_url'] = $r['media_url'] ? (string) $r['media_url'] : null;
            $base['description'] = (string) $r['description'];
            $gallery = [];
            if (!empty($r['portfolio_urls_json'])) {
                $decoded = json_decode((string) $r['portfolio_urls_json'], true);
                if (is_array($decoded)) {
                    foreach ($decoded as $u) {
                        if (is_string($u) && $u !== '') {
                            $gallery[] = $u;
                        }
                    }
                }
            }
            $base['gallery_urls'] = array_slice($gallery, 0, 12);
            $lt = (string) ($r['listing_type'] ?? '');
            $typeLabel = $lt === 'service' ? 'Service' : ($lt === 'classified' ? 'Classified' : ucfirst($lt));
            $cur = (string) ($r['currency'] ?: 'USD');
            if ((int) ($r['is_free'] ?? 0) === 1) {
                $base['meta_line'] = $typeLabel . ' · FREE';
            } elseif ($r['price_amount'] !== null) {
                $pa = (string) $r['price_amount'];
                $suffix = ($r['pricing_type'] ?? '') === 'hourly' ? '/hr' : '';
                $base['meta_line'] = $typeLabel . ' · ' . $cur . ' ' . $pa . $suffix;
            } else {
                $base['meta_line'] = $typeLabel;
            }
            $base['subtitle'] = $base['meta_line'];

            return $base;
        }

        if ($subjectType === 'product') {
            $st = $pdo->prepare(
                'SELECT p.name, p.description, p.specifications, p.image_url, p.price_amount, p.currency, s.name AS store_name
                 FROM store_products p
                 INNER JOIN stores s ON s.id = p.store_id
                 WHERE p.id = ? AND p.moderation_status = ? AND s.moderation_status = ?
                 LIMIT 1'
            );
            $st->execute([$subjectId, 'approved', 'approved']);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) {
                return null;
            }
            $base['title'] = (string) $r['name'];
            $base['hero_image_url'] = $r['image_url'] ? (string) $r['image_url'] : null;
            $base['description'] = $r['description'] ? (string) $r['description'] : null;
            $base['specifications'] = $r['specifications'] ? (string) $r['specifications'] : null;
            $base['store_name'] = (string) ($r['store_name'] ?? '');
            if ($base['hero_image_url']) {
                $base['gallery_urls'] = [$base['hero_image_url']];
            }
            $cur = (string) ($r['currency'] ?: 'USD');
            if ($r['price_amount'] !== null) {
                $base['meta_line'] = $cur . ' ' . (string) $r['price_amount'] . ' · ' . $base['store_name'];
            } else {
                $base['meta_line'] = $base['store_name'];
            }
            $base['subtitle'] = $base['meta_line'];

            return $base;
        }

        if ($subjectType === 'directory_entry') {
            $st = $pdo->prepare(
                'SELECT business_name, description, logo_url FROM directory_entries WHERE id = ? AND moderation_status = ? LIMIT 1'
            );
            $st->execute([$subjectId, 'approved']);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) {
                return null;
            }
            $base['title'] = (string) $r['business_name'];
            $base['hero_image_url'] = $r['logo_url'] ? (string) $r['logo_url'] : null;
            $base['description'] = $r['description'] ? (string) $r['description'] : null;
            if ($base['hero_image_url']) {
                $base['gallery_urls'] = [$base['hero_image_url']];
            }
            $base['meta_line'] = 'Business directory';
            $base['subtitle'] = $base['meta_line'];

            return $base;
        }

        if ($subjectType === 'member') {
            $st = $pdo->prepare(
                'SELECT username, first_name, last_name, avatar_url FROM users WHERE id = ? AND status = ? LIMIT 1'
            );
            $st->execute([$subjectId, 'verified']);
            $r = $st->fetch(PDO::FETCH_ASSOC);
            if (!$r) {
                return null;
            }
            $name = trim((string) ($r['first_name'] ?? '') . ' ' . (string) ($r['last_name'] ?? ''));
            if ($name === '') {
                $name = '@' . (string) ($r['username'] ?? '');
            }
            $base['title'] = $name;
            $base['hero_image_url'] = $r['avatar_url'] ? (string) $r['avatar_url'] : null;
            if ($base['hero_image_url']) {
                $base['gallery_urls'] = [$base['hero_image_url']];
            }
            $base['meta_line'] = 'Member profile';
            $base['subtitle'] = '@' . (string) ($r['username'] ?? '');

            return $base;
        }
    } catch (Throwable) {
        return null;
    }

    return null;
}

function ww_commerce_notify(PDO $pdo, int $userId, string $subject, string $body, int $requestId): void
{
    try {
        ww_push_to_user($pdo, $userId, $subject, $body, ['type' => 'commerce_request', 'request_id' => $requestId]);
    } catch (Throwable) {
        // Push failures should not block order/request creation.
    }

    try {
        $st = $pdo->prepare('SELECT email, first_name, last_name, username FROM users WHERE id = ? LIMIT 1');
        $st->execute([$userId]);
        $u = $st->fetch(PDO::FETCH_ASSOC);
        if (!$u || empty($u['email'])) {
            return;
        }
        $name = trim((string) ($u['first_name'] ?? '') . ' ' . (string) ($u['last_name'] ?? ''));
        if ($name === '') {
            $name = (string) ($u['username'] ?? 'WWC member');
        }
        $safeSubject = htmlspecialchars($subject, ENT_QUOTES, 'UTF-8');
        $safeBody = nl2br(htmlspecialchars($body, ENT_QUOTES, 'UTF-8'));
        $year = date('Y');
        $html = '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Witness World Connect</title>
</head>
<body style="margin:0;padding:0;background:#EEF6FC;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Arial,sans-serif;color:#0B1220;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">' . $safeSubject . '</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EEF6FC;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:22px;overflow:hidden;box-shadow:0 16px 42px rgba(15,40,71,0.12);border:1px solid rgba(31,170,242,0.18);">
          <tr>
            <td style="background:#0f2847;padding:28px 28px 24px;text-align:center;border-bottom:3px solid #1FAAF2;">
              <div style="display:inline-block;width:72px;height:72px;border-radius:22px;background:#1FAAF2;color:#ffffff;font-family:Georgia,serif;font-size:34px;font-weight:700;line-height:72px;text-align:center;">W</div>
              <p style="margin:14px 0 0;font-size:11px;font-weight:800;letter-spacing:0.22em;text-transform:uppercase;color:rgba(255,255,255,0.74);">Witness World Connect</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 30px 10px;">
              <p style="display:inline-block;margin:0 0 14px;padding:6px 10px;border-radius:999px;background:rgba(200,162,74,0.16);color:#9A7328;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;">Commerce request</p>
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;font-weight:850;color:#0f2847;">' . $safeSubject . '</h1>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.65;color:#5C6B7A;">' . $safeBody . '</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;background:#F8FCFF;border:1px solid rgba(31,170,242,0.16);border-radius:16px;">
                <tr>
                  <td style="padding:18px 18px;">
                    <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#0f2847;">Safety reminder</p>
                    <p style="margin:0;font-size:13px;line-height:1.55;color:#5C6B7A;">Keep communication inside WWC, confirm details before moving forward, and report suspicious behavior or payment pressure.</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px;font-size:13px;line-height:1.5;color:#5C6B7A;">Open the app and go to your Sales Dashboard or Requests page to review this update.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 30px 28px;border-top:1px solid #E6E1D3;text-align:center;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;">Connect, share, and grow with friends worldwide.</p>
              <p style="margin:10px 0 0;font-size:11px;color:#cbd5e1;">&copy; ' . $year . ' Witness World Connect</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
        (new Mailer($pdo))->send((string) $u['email'], $name, $subject, $html, $body);
    } catch (Throwable) {
        // Email is best-effort in V1.
    }
}

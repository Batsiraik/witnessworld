<?php

declare(strict_types=1);

/**
 * Shared validation + update for admin / member profile edits.
 */

require_once dirname(__DIR__, 2) . '/api/lib/listing_helpers.php';

/**
 * @return list<string>
 */
function ww_profile_allowed_member_types(): array
{
    return [
        'Unbaptized publisher',
        'Baptized publisher',
        'Pioneer',
        'Servant',
        'Elder',
    ];
}

function ww_profile_normalize_member_type(string $memberType): ?string
{
    foreach (ww_profile_allowed_member_types() as $allowed) {
        if (strcasecmp(trim($memberType), $allowed) === 0) {
            return $allowed;
        }
    }

    return null;
}

/**
 * @return DateTimeImmutable|null
 */
function ww_profile_parse_date(string $value): ?DateTimeImmutable
{
    $value = trim($value);
    if ($value === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        return null;
    }

    return $date;
}

/**
 * @param array<string, mixed> $in
 * @return array{ok:true, data:array<string, mixed>}|array{ok:false, error:string}
 */
function ww_profile_validate_fields(array $in, bool $requireAll = true): array
{
    $first = trim((string) ($in['first_name'] ?? ''));
    $last = trim((string) ($in['last_name'] ?? ''));
    $username = strtolower(preg_replace('/\s+/', '', (string) ($in['username'] ?? '')) ?? '');
    $email = strtolower(trim((string) ($in['email'] ?? '')));
    $phone = trim((string) ($in['phone'] ?? ''));
    $dateOfBirth = trim((string) ($in['date_of_birth'] ?? ''));
    $memberType = trim((string) ($in['member_type'] ?? ''));
    $baptismDate = trim((string) ($in['baptism_date'] ?? ''));
    $countryCode = strtoupper(trim((string) ($in['registration_country_code'] ?? $in['country_code'] ?? '')));

    if ($requireAll || array_key_exists('first_name', $in) || array_key_exists('last_name', $in)) {
        if ($first === '' || $last === '') {
            return ['ok' => false, 'error' => 'First and last name are required.'];
        }
    }
    if ($requireAll || array_key_exists('username', $in)) {
        if ($username === '' || strlen($username) < 2) {
            return ['ok' => false, 'error' => 'Username must be at least 2 characters.'];
        }
        if (!preg_match('/^[a-z0-9._-]+$/', $username)) {
            return ['ok' => false, 'error' => 'Username may only use letters, numbers, dots, underscores, and hyphens.'];
        }
    }
    if ($requireAll || array_key_exists('email', $in)) {
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return ['ok' => false, 'error' => 'A valid email is required.'];
        }
    }
    if ($requireAll || array_key_exists('phone', $in)) {
        if ($phone === '') {
            return ['ok' => false, 'error' => 'Phone number is required.'];
        }
    }

    $dob = $dateOfBirth !== '' ? ww_profile_parse_date($dateOfBirth) : null;
    if ($requireAll || $dateOfBirth !== '') {
        if (!$dob) {
            return ['ok' => false, 'error' => 'Valid date of birth is required (YYYY-MM-DD).'];
        }
        $today = new DateTimeImmutable('today');
        if ($dob->diff($today)->y < 16) {
            return ['ok' => false, 'error' => 'Member must be at least 16 years old.'];
        }
    }

    $memberTypeNormalized = $memberType !== '' ? ww_profile_normalize_member_type($memberType) : null;
    if ($requireAll || $memberType !== '') {
        if ($memberTypeNormalized === null) {
            return ['ok' => false, 'error' => 'Select a valid member type.'];
        }
    }

    $isUnbaptized = $memberTypeNormalized !== null
        && strcasecmp($memberTypeNormalized, 'Unbaptized publisher') === 0;
    $baptismParsed = $baptismDate !== '' ? ww_profile_parse_date($baptismDate) : null;
    if ($memberTypeNormalized !== null && !$isUnbaptized) {
        if (!$baptismParsed) {
            return ['ok' => false, 'error' => 'Baptism date is required for this member type.'];
        }
    } elseif ($baptismDate !== '' && !$baptismParsed) {
        return ['ok' => false, 'error' => 'Use YYYY-MM-DD format for baptism date.'];
    }

    $countryMap = ww_listing_country_map();
    $countryName = '';
    if ($requireAll || $countryCode !== '') {
        if ($countryCode === '' || strlen($countryCode) !== 2 || !isset($countryMap[$countryCode])) {
            return ['ok' => false, 'error' => 'Select a valid country.'];
        }
        $countryName = $countryMap[$countryCode];
    }

    return [
        'ok' => true,
        'data' => [
            'first_name' => $first,
            'last_name' => $last,
            'username' => $username,
            'email' => $email,
            'phone' => $phone,
            'date_of_birth' => $dob ? $dob->format('Y-m-d') : null,
            'member_type' => $memberTypeNormalized,
            'baptism_date' => $baptismParsed ? $baptismParsed->format('Y-m-d') : null,
            'registration_country_code' => $countryCode,
            'registration_country_name' => $countryName,
        ],
    ];
}

/**
 * @param array<string, mixed> $current User row
 * @param array<string, mixed> $data Validated fields
 * @return array{ok:true, changed:bool, reverify:bool}|array{ok:false, error:string}
 */
function ww_profile_apply_update(PDO $pdo, int $userId, array $current, array $data, bool $reverifyOnChange): array
{
    if ($userId <= 0) {
        return ['ok' => false, 'error' => 'Invalid user'];
    }

    $email = (string) $data['email'];
    $username = (string) $data['username'];

    $chk = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
    $chk->execute([$email, $userId]);
    if ($chk->fetch()) {
        return ['ok' => false, 'error' => 'That email is already used by another account.'];
    }

    $chk2 = $pdo->prepare('SELECT id FROM users WHERE username = ? AND id != ? LIMIT 1');
    $chk2->execute([$username, $userId]);
    if ($chk2->fetch()) {
        return ['ok' => false, 'error' => 'That username is already taken.'];
    }

    $watch = [
        'first_name',
        'last_name',
        'username',
        'email',
        'phone',
        'date_of_birth',
        'member_type',
        'baptism_date',
        'registration_country_code',
    ];
    $changed = false;
    foreach ($watch as $key) {
        $old = (string) ($current[$key] ?? '');
        $new = (string) ($data[$key] ?? '');
        if ($key === 'baptism_date' || $key === 'date_of_birth') {
            $old = $old === '' ? '' : substr($old, 0, 10);
            $new = $new === '' ? '' : substr($new, 0, 10);
        }
        if (strcasecmp($old, $new) !== 0) {
            $changed = true;
            break;
        }
    }

    $pdo->prepare(
        'UPDATE users SET
            first_name = ?,
            last_name = ?,
            username = ?,
            email = ?,
            phone = ?,
            date_of_birth = ?,
            member_type = ?,
            baptism_date = ?,
            registration_country_code = ?,
            registration_country_name = ?
         WHERE id = ?'
    )->execute([
        $data['first_name'],
        $data['last_name'],
        $data['username'],
        $data['email'],
        $data['phone'],
        $data['date_of_birth'],
        $data['member_type'],
        $data['baptism_date'],
        $data['registration_country_code'],
        $data['registration_country_name'],
        $userId,
    ]);

    $didReverify = false;
    if ($reverifyOnChange && $changed && (string) ($current['status'] ?? '') === 'verified') {
        $pdo->prepare("UPDATE users SET status = 'pending_verification' WHERE id = ? AND status = 'verified'")
            ->execute([$userId]);
        $didReverify = true;

        require_once __DIR__ . '/user_admin_actions.php';
        ww_admin_revoke_user_tokens($pdo, $userId);

        require_once __DIR__ . '/push_triggers.php';
        ww_push_to_user(
            $pdo,
            $userId,
            'Account update',
            'Your profile was updated. An admin must verify your account again before you can continue using Witness World Connect.',
            ['type' => 'account', 'status' => 'pending_verification']
        );

        require_once __DIR__ . '/admin_notifications.php';
        ww_admin_alert_pending_user_verification($pdo, $userId);
    }

    return ['ok' => true, 'changed' => $changed, 'reverify' => $didReverify];
}

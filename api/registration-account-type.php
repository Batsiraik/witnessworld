<?php

declare(strict_types=1);

require_once __DIR__ . '/bootstrap.php';
require_once __DIR__ . '/lib/user_tokens.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    ww_json(['ok' => false, 'error' => 'Method not allowed'], 405);
}

$tok = ww_bearer_token();
if (!$tok) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$pdo = witnessworld_pdo();
$user = ww_user_from_token($pdo, $tok);
if (!$user) {
    ww_json(['ok' => false, 'error' => 'Unauthorized'], 401);
}

$status = (string) ($user['status'] ?? '');
if ($status !== 'pending_verification') {
    ww_json(['ok' => false, 'error' => 'This step only applies while your account is pending verification'], 422);
}

$in = ww_read_json();

$accountType = strtolower(trim((string) ($in['account_type'] ?? $in['registration_account_type'] ?? '')));
if (!in_array($accountType, ['individual', 'business'], true)) {
    ww_json(['ok' => false, 'error' => 'Select Individual or Business'], 422);
}

$purpose = strtolower(trim((string) ($in['primary_purpose'] ?? $in['registration_primary_purpose'] ?? '')));
if (!in_array($purpose, ['browsing_connecting', 'promoting_business', 'both'], true)) {
    ww_json(['ok' => false, 'error' => 'Select your primary purpose'], 422);
}

$wantsAccountManager = strtolower(trim((string) ($in['wants_account_manager'] ?? $in['registration_wants_account_manager'] ?? '')));
if (!in_array($wantsAccountManager, ['yes', 'no'], true)) {
    ww_json(['ok' => false, 'error' => 'Please indicate if you would like account manager support'], 422);
}

$referral = strtolower(trim((string) ($in['referral_source'] ?? $in['registration_referral_source'] ?? '')));
if (!in_array($referral, ['friend_family', 'social_media', 'whatsapp_group', 'wwc_team_member', 'other'], true)) {
    ww_json(['ok' => false, 'error' => 'Select how you heard about WWC'], 422);
}

$referralOther = trim((string) ($in['referral_other'] ?? $in['registration_referral_other'] ?? ''));
$needsReferralDetail = in_array($referral, ['friend_family', 'whatsapp_group', 'wwc_team_member', 'other'], true);
if ($needsReferralDetail) {
    if ($referralOther === '' || mb_strlen($referralOther) < 2) {
        $msg = match ($referral) {
            'whatsapp_group' => 'Please enter the WhatsApp group name',
            'friend_family' => 'Please enter the name of the person who referred you',
            'wwc_team_member' => 'Please enter the name of the WWC team member',
            default => 'Please specify how you heard about us',
        };
        ww_json(['ok' => false, 'error' => $msg], 422);
    }
    if (mb_strlen($referralOther) > 200) {
        ww_json(['ok' => false, 'error' => 'Referral note is too long'], 422);
    }
} else {
    $referralOther = '';
}

$existingAcct = (string) ($user['registration_account_type'] ?? '');
$existingPurpose = (string) ($user['registration_primary_purpose'] ?? '');
$existingAccountManager = (string) ($user['registration_wants_account_manager'] ?? '');
$existingReferral = (string) ($user['registration_referral_source'] ?? '');
if ($existingAcct !== '' && $existingPurpose !== '' && $existingAccountManager !== '' && $existingReferral !== '') {
    ww_json([
        'ok' => true,
        'registration_account_type' => $existingAcct,
        'registration_primary_purpose' => $existingPurpose,
        'registration_wants_account_manager' => $existingAccountManager,
        'registration_referral_source' => $existingReferral,
        'registration_referral_other' => (string) ($user['registration_referral_other'] ?? ''),
    ]);
}

$up = $pdo->prepare(
    'UPDATE users SET registration_account_type = ?, registration_primary_purpose = ?, registration_wants_account_manager = ?, registration_referral_source = ?, registration_referral_other = ? WHERE id = ?'
);
$up->execute([$accountType, $purpose, $wantsAccountManager, $referral, $referralOther !== '' ? $referralOther : null, (int) $user['id']]);

ww_json([
    'ok' => true,
    'registration_account_type' => $accountType,
    'registration_primary_purpose' => $purpose,
    'registration_wants_account_manager' => $wantsAccountManager,
    'registration_referral_source' => $referral,
    'registration_referral_other' => $referralOther,
]);

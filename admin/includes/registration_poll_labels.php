<?php

declare(strict_types=1);

function ww_poll_account_type_label(string $v): string
{
    return match ($v) {
        'business' => 'Business',
        'individual' => 'Individual',
        default => '—',
    };
}

function ww_poll_primary_purpose_label(string $v): string
{
    return match ($v) {
        'browsing_connecting' => 'Browsing & Connecting',
        'promoting_business' => 'Promoting a Business or Service',
        'both' => 'Both',
        default => '—',
    };
}

function ww_poll_referral_label(string $source, ?string $other = null): string
{
    $base = match ($source) {
        'friend_family' => 'Friend / Family',
        'social_media' => 'Social Media',
        'whatsapp_group' => 'WhatsApp Group',
        'wwc_team_member' => 'WWC Team Member',
        'other' => 'Other',
        default => '—',
    };
    if ($source === 'other' && $other !== null && trim($other) !== '') {
        return $base . ': ' . trim($other);
    }

    return $base;
}

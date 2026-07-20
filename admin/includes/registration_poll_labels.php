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

function ww_poll_account_manager_label(string $v): string
{
    return match ($v) {
        'yes' => 'Yes — interested in account manager support',
        'no' => 'No — I will manage my own listings',
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
    if (
        in_array($source, ['friend_family', 'whatsapp_group', 'wwc_team_member', 'other'], true)
        && $other !== null
        && trim($other) !== ''
    ) {
        return $base . ': ' . trim($other);
    }

    return $base;
}

/** Placeholder / hint for the follow-up detail field. */
function ww_poll_referral_detail_prompt(string $source): string
{
    return match ($source) {
        'whatsapp_group' => 'WhatsApp group name',
        'friend_family' => 'Name of the person who referred you',
        'wwc_team_member' => 'Name of the WWC team member',
        'other' => 'Please specify',
        default => '',
    };
}

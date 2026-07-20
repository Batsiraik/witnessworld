import type { DashboardUser } from '../context/DashboardContext';

export type RegistrationReferralSource =
  | 'friend_family'
  | 'social_media'
  | 'whatsapp_group'
  | 'wwc_team_member'
  | 'other';

/** Referral options that require a free-text detail (group/person name, etc.). */
export function referralSourceNeedsDetail(
  source: string | null | undefined
): source is 'friend_family' | 'whatsapp_group' | 'wwc_team_member' | 'other' {
  return (
    source === 'friend_family' ||
    source === 'whatsapp_group' ||
    source === 'wwc_team_member' ||
    source === 'other'
  );
}

export function referralDetailPlaceholder(source: string | null | undefined): string {
  switch (source) {
    case 'whatsapp_group':
      return 'WhatsApp group name';
    case 'friend_family':
      return 'Name of the person who referred you';
    case 'wwc_team_member':
      return 'Name of the WWC team member';
    case 'other':
      return 'Please specify';
    default:
      return '';
  }
}

export function isRegistrationPollComplete(user: DashboardUser | null | undefined): boolean {
  if (!user) return false;
  if (
    !user.registration_account_type ||
    !user.registration_primary_purpose ||
    !user.registration_wants_account_manager ||
    !user.registration_referral_source
  ) {
    return false;
  }
  if (referralSourceNeedsDetail(user.registration_referral_source)) {
    return Boolean(user.registration_referral_other?.trim());
  }
  return true;
}

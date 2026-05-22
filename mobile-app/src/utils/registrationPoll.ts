import type { DashboardUser } from '../context/DashboardContext';

export function isRegistrationPollComplete(user: DashboardUser | null | undefined): boolean {
  if (!user) return false;
  if (!user.registration_account_type || !user.registration_primary_purpose || !user.registration_referral_source) {
    return false;
  }
  if (user.registration_referral_source === 'other') {
    return Boolean(user.registration_referral_other?.trim());
  }
  return true;
}

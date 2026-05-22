/** Congregation role options at signup (must match api/register.php). */
export const SIGNUP_MEMBER_ROLES = [
  'Unbaptized publisher',
  'Baptized publisher',
  'Pioneer',
  'Servant',
  'Elder',
] as const;

export type SignupMemberRole = (typeof SIGNUP_MEMBER_ROLES)[number];

export const SIGNUP_MIN_AGE = 16;

export function isUnbaptizedPublisher(role: string): boolean {
  return role.trim().toLowerCase() === 'unbaptized publisher';
}

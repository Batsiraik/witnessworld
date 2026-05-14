/**
 * Mirrors `api/lib/subscription_helpers.php` → `ww_subscription_plans()`.
 * Used only if `membership-plans-public.php` cannot be reached.
 */
export type PublicPlan = {
  key: string;
  title: string;
  price: number;
  badge?: string;
  features?: string[];
};

export const MEMBERSHIP_PLANS_FALLBACK: PublicPlan[] = [
  {
    key: 'free',
    title: 'User Member',
    price: 0,
    badge: 'Always Free',
    features: ['Browse listings', 'Save favorites', 'Receive notifications', 'Message businesses'],
  },
  {
    key: 'plus',
    title: 'User Member Plus',
    price: 10,
    badge: '1 Regular Ad',
    features: ['Post 1 regular ad/listing', 'Ad-free browsing', 'No featured/top placement'],
  },
  {
    key: 'starter',
    title: 'Starter Business',
    price: 25,
    badge: 'Starter',
    features: ['2 active regular ads', 'Basic business profile', 'Marketplace & directory visibility'],
  },
  {
    key: 'growth',
    title: 'Growth Business',
    price: 50,
    badge: 'Most Popular',
    features: ['Up to 3 active ads', '14 Featured days/month', '7 Top Ad days/month', 'Quarterly mentions'],
  },
  {
    key: 'elite',
    title: 'Elite Business',
    price: 150,
    badge: 'Done-For-You',
    features: ['Personal account manager', 'Up to 5 active ads', 'Managed visibility', 'Priority support'],
  },
];

export const MEMBERSHIP_TRIAL_DAYS_FALLBACK = 90;

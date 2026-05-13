import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createContext, useContext, type ReactNode } from 'react';
import type { RootStackParamList } from '../navigation/types';

export type DashboardUser = {
  id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  username?: string;
  status?: string;
  avatar_url?: string | null;
  membership_plan?: string;
  subscription_status?: string;
  trial_ends_at?: string | null;
};

export type SubscriptionInfo = {
  plan: string;
  status: string;
  plan_title: string;
  trial_ends_at?: string | null;
  grace_ends_at?: string | null;
  stripe_payment_method_status?: string;
  features?: {
    can_post?: boolean;
    max_active_ads?: number;
    featured_days?: number;
    top_ad_days?: number;
    storefront?: boolean;
    [key: string]: unknown;
  };
  plans?: Array<Record<string, unknown>>;
  trial_days?: number;
};

type Ctx = {
  user: DashboardUser | null;
  subscription: SubscriptionInfo | null;
  /** True when browsing without a logged-in account */
  isGuest: boolean;
  /** Prompt to sign in or register (guest-only actions) */
  showGuestPrompt: () => void;
  supportEmail: string;
  supportAvailable: boolean;
  refreshProfile: () => Promise<void>;
  stackNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({
  children,
  user,
  subscription,
  isGuest,
  showGuestPrompt,
  supportEmail,
  supportAvailable,
  refreshProfile,
  stackNavigation,
}: {
  children: ReactNode;
  user: DashboardUser | null;
  subscription: SubscriptionInfo | null;
  isGuest: boolean;
  showGuestPrompt: () => void;
  supportEmail: string;
  supportAvailable: boolean;
  refreshProfile: () => Promise<void>;
  stackNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
}) {
  return (
    <DashboardContext.Provider
      value={{
        user,
        subscription,
        isGuest,
        showGuestPrompt,
        supportEmail,
        supportAvailable,
        refreshProfile,
        stackNavigation,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): Ctx {
  const c = useContext(DashboardContext);
  if (!c) {
    throw new Error('useDashboardContext must be used within DashboardProvider');
  }
  return c;
}

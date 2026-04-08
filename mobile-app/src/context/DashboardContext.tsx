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
};

type Ctx = {
  user: DashboardUser | null;
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
  isGuest,
  showGuestPrompt,
  supportEmail,
  supportAvailable,
  refreshProfile,
  stackNavigation,
}: {
  children: ReactNode;
  user: DashboardUser | null;
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

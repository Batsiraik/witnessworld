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
  supportEmail: string;
  refreshProfile: () => Promise<void>;
  stackNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

const DashboardContext = createContext<Ctx | null>(null);

export function DashboardProvider({
  children,
  user,
  supportEmail,
  refreshProfile,
  stackNavigation,
}: {
  children: ReactNode;
  user: DashboardUser | null;
  supportEmail: string;
  refreshProfile: () => Promise<void>;
  stackNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
}) {
  return (
    <DashboardContext.Provider
      value={{ user, supportEmail, refreshProfile, stackNavigation }}
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

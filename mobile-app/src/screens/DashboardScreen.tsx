import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { VerificationLockOverlay } from '../components/VerificationLockOverlay';
import { DashboardProvider, type DashboardUser } from '../context/DashboardContext';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { MainDrawerNavigator } from '../navigation/MainDrawerNavigator';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [supportEmail, setSupportEmail] = useState('info@witnessworldconnect.com');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('me.php', true);
      const u = (data.user as DashboardUser) || null;
      setUser(u);
      if (typeof data.support_email === 'string' && data.support_email) {
        setSupportEmail(data.support_email);
      }
      if (u?.status === 'pending_questions') {
        navigation.reset({ index: 0, routes: [{ name: 'Questionnaire' }] });
        return;
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [navigation]);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await apiGet('me.php', true);
      const u = (data.user as DashboardUser) || null;
      setUser(u);
      if (typeof data.support_email === 'string' && data.support_email) {
        setSupportEmail(data.support_email);
      }
    } catch {
      /* keep existing user on transient errors */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const status = user?.status ?? '';
  const lockUnverified = status === 'pending_verification' || status === 'declined';
  const overlayVariant = status === 'declined' ? 'declined' : 'pending';

  usePushRegistration(!loading && !!user, user?.status);

  useEffect(() => {
    if (!lockUnverified) return undefined;
    let previous: AppStateStatus = AppState.currentState;
    const sub = AppState.addEventListener('change', (next) => {
      if (previous.match(/inactive|background/) && next === 'active') {
        void refreshProfile();
      }
      previous = next;
    });
    return () => sub.remove();
  }, [lockUnverified, refreshProfile]);

  return (
    <GradientBackground>
      {loading ? (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      ) : (
        <DashboardProvider
          user={user}
          supportEmail={supportEmail}
          refreshProfile={refreshProfile}
          stackNavigation={navigation}
        >
          <View style={styles.fill}>
            <MainDrawerNavigator parentNavigation={navigation} />
            <VerificationLockOverlay
              visible={lockUnverified}
              variant={overlayVariant}
              supportEmail={supportEmail}
              onRecheckStatus={refreshProfile}
            />
          </View>
        </DashboardProvider>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

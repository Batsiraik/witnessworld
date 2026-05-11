import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, type AppStateStatus, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, getStoredToken } from '../api/client';
import { PrimaryButton } from '../components/PrimaryButton';
import { GradientBackground } from '../components/GradientBackground';
import { VerificationLockOverlay } from '../components/VerificationLockOverlay';
import { DashboardProvider, type DashboardUser } from '../context/DashboardContext';
import { usePushRegistration } from '../hooks/usePushRegistration';
import { MainTabNavigator } from '../navigation/MainTabNavigator';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: Props) {
  const isDashboardFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [sessionLoadError, setSessionLoadError] = useState(false);
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [supportEmail, setSupportEmail] = useState('info@witnessworldconnect.com');
  const [supportAvailable, setSupportAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setSessionLoadError(false);
    const token = await getStoredToken();
    if (!token) {
      setLoading(false);
      navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      return;
    }
    try {
      const data = await apiGet('me.php', true);
      const u = (data.user as DashboardUser) || null;
      if (!u) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }
      setUser(u);
      if (typeof data.support_email === 'string' && data.support_email) {
        setSupportEmail(data.support_email);
      }
      setSupportAvailable(data.support_available === true);
    } catch {
      if (!(await getStoredToken())) {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        return;
      }
      setSessionLoadError(true);
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
      setSupportAvailable(data.support_available === true);
      setSessionLoadError(false);
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

  usePushRegistration(!loading && !!user && !sessionLoadError);

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

  if (sessionLoadError && !loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <Text style={styles.errTitle}>Couldn&apos;t load your account</Text>
            <Text style={styles.errHint}>Check your connection and try again. You stay signed in — we won&apos;t log you out.</Text>
            <PrimaryButton label="Try again" onPress={() => void load()} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      {loading ? (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      ) : user ? (
        <DashboardProvider
          user={user}
          isGuest={false}
          showGuestPrompt={() => {}}
          supportEmail={supportEmail}
          supportAvailable={supportAvailable}
          refreshProfile={refreshProfile}
          stackNavigation={navigation}
        >
          <View style={styles.fill}>
            <MainTabNavigator />
            <VerificationLockOverlay
              visible={lockUnverified && isDashboardFocused}
              variant={overlayVariant}
              supportEmail={supportEmail}
              supportAvailable={supportAvailable}
              onMessageSupport={() => navigation.navigate('SupportChat', {})}
              onRecheckStatus={refreshProfile}
            />
          </View>
        </DashboardProvider>
      ) : (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </SafeAreaView>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 10 },
  errHint: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
    maxWidth: 320,
    fontWeight: '500',
  },
});

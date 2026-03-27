import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { apiGet, getStoredToken, setStoredToken } from '../api/client';
import type { RootStackParamList } from './types';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { ForgotPasswordEmailScreen } from '../screens/ForgotPasswordEmailScreen';
import { ForgotPasswordOtpScreen } from '../screens/ForgotPasswordOtpScreen';
import { RecoverPasswordScreen } from '../screens/RecoverPasswordScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { RegisterOtpScreen } from '../screens/RegisterOtpScreen';
import { QuestionnaireScreen } from '../screens/QuestionnaireScreen';
import { PrivacyPolicyScreen } from '../screens/PrivacyPolicyScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { SupportChatScreen } from '../screens/SupportChatScreen';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Never leave bootstrap spinning forever (Expo Go "100%" stuck). */
const BOOTSTRAP_FALLBACK_MS = 22_000;

export function RootNavigator() {
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fallbackTimer = setTimeout(() => {
      if (!cancelled) {
        setInitialRoute((prev) => (prev === null ? 'Welcome' : prev));
      }
    }, BOOTSTRAP_FALLBACK_MS);

    (async () => {
      try {
        const token = await getStoredToken();
        if (!token) {
          if (!cancelled) setInitialRoute('Welcome');
          return;
        }
        const data = await apiGet('me.php', true);
        const status = (data.user as { status?: string } | undefined)?.status;
        if (cancelled) return;
        if (status === 'pending_questions') {
          setInitialRoute('Questionnaire');
        } else {
          setInitialRoute('Dashboard');
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        const unauthorized =
          msg === 'Unauthorized' ||
          msg.includes('401') ||
          msg.toLowerCase().includes('unauthorized');
        if (unauthorized) {
          await setStoredToken(null);
          if (!cancelled) setInitialRoute('Welcome');
        } else {
          const stillHave = await getStoredToken();
          if (!cancelled) setInitialRoute(stillHave ? 'Dashboard' : 'Welcome');
        }
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (initialRoute === null) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bgTop,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
        animation: 'fade_from_bottom',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPasswordEmail" component={ForgotPasswordEmailScreen} />
      <Stack.Screen name="ForgotPasswordOtp" component={ForgotPasswordOtpScreen} />
      <Stack.Screen name="RecoverPassword" component={RecoverPasswordScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="RegisterOtp" component={RegisterOtpScreen} />
      <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="SupportChat" component={SupportChatScreen} />
    </Stack.Navigator>
  );
}

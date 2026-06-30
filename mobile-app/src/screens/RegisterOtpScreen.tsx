import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost, ApiError, setStoredToken } from '../api/client';
import { AuthFormCard } from '../components/AuthFormCard';
import { AuthFormIntro } from '../components/AuthFormIntro';
import { GradientBackground } from '../components/GradientBackground';
import { OtpCodeField } from '../components/OtpCodeField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { authFormStyles } from '../theme/authForm';
import { colors } from '../theme/colors';
type Props = NativeStackScreenProps<RootStackParamList, 'RegisterOtp'>;

export function RegisterOtpScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const resendCode = async () => {
    if (resendBusy || resendCooldown > 0) return;
    setResendBusy(true);
    try {
      await apiPost('resend-registration-otp.php', { email }, false);
      setResendCooldown(45);
      Alert.alert('Code sent', 'We sent a new verification code to your email. Check your spam folder if you do not see it.');
    } catch (e) {
      if (e instanceof ApiError && e.retryAfter) {
        setResendCooldown(e.retryAfter);
      }
      Alert.alert('Resend code', e instanceof Error ? e.message : 'Could not resend code');
    } finally {
      setResendBusy(false);
    }
  };

  const submit = async () => {
    const cleaned = otp.replace(/\D/g, '');
    if (cleaned.length !== 6) {
      setError('Enter the 6-digit code from your email');
      return;
    }
    setError(undefined);
    setLoading(true);
    try {
      await setStoredToken(null);
      const data = await apiPost('verify-registration-otp.php', { email, otp: cleaned }, false);
      const token = data.token as string | undefined;
      if (!token) throw new Error('No token returned');
      await setStoredToken(token);

      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      setError(msg);
      Alert.alert('Verification', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="" onBack={() => navigation.goBack()} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <AuthFormIntro
              title="Verify your email"
              subtitle={
                'We sent a 6-digit code to ' + email + '. Enter it below to finish creating your account.'
              }
              showLogo={false}
            />
            <AuthFormCard>
              <OtpCodeField
                label="Verification code"
                value={otp}
                onChangeText={setOtp}
                error={error}
              />
              <PrimaryButton label="Continue" onPress={submit} loading={loading} />
              <Pressable
                onPress={() => void resendCode()}
                disabled={resendBusy || resendCooldown > 0}
                style={({ pressed }) => [
                  styles.resendBtn,
                  (resendBusy || resendCooldown > 0) && styles.resendBtnDisabled,
                  pressed && !resendBusy && resendCooldown <= 0 && styles.resendPressed,
                ]}
              >
                <Text style={styles.resendText}>
                  {resendBusy
                    ? 'Sending…'
                    : resendCooldown > 0
                      ? `Resend code in ${resendCooldown}s`
                      : 'Resend code'}
                </Text>
              </Pressable>
            </AuthFormCard>
            <Text style={authFormStyles.footerNote}>
              Didn&apos;t receive the code? Tap resend above or check your spam folder. You can also go back and confirm your email address is correct.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 32,
  },
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  resendBtnDisabled: { opacity: 0.55 },
  resendPressed: { opacity: 0.88 },
  resendText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
});

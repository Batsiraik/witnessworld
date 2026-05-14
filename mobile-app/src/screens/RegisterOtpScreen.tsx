import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost, setStoredToken } from '../api/client';
import { AppTextField } from '../components/AppTextField';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RegisterOtp'>;

type VerifySubscription = {
  plan?: string;
  stripe_payment_method_status?: string;
  trial_days?: number;
};

export function RegisterOtpScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);

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

      const sub = data.subscription as VerifySubscription | undefined;
      const plan = typeof sub?.plan === 'string' ? sub.plan : 'free';
      const pm = String(sub?.stripe_payment_method_status ?? '');
      const trialDays =
        typeof sub?.trial_days === 'number' && Number.isFinite(sub.trial_days)
          ? sub.trial_days
          : 90;

      const goDashboard = () => {
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      };

      if (plan !== 'free' && pm !== 'attached') {
        Alert.alert(
          'Add a payment method',
          `Your ${trialDays}-day trial is active. Enter your card in the next screen (secure Stripe form inside the app). In test mode use 4242 4242 4242 4242 with any future expiry and any CVC. You are not charged until after the trial ends.`,
          [
            { text: "I'll add later", style: 'cancel', onPress: goDashboard },
            {
              text: 'Add card',
              onPress: () =>
                navigation.navigate('AddPaymentCard', {
                  returnTo: 'register_complete',
                  email,
                }),
            },
          ]
        );
        return;
      }

      goDashboard();
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
        <ScreenHeader title="Verify email" onBack={() => navigation.goBack()} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerBlock}>
              <Text style={styles.lead}>
                We sent a code to <Text style={styles.email}>{email}</Text>. Enter it to continue.
              </Text>
              <GlassCard>
                <AppTextField
                  label="Verification code"
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="••••••"
                  error={error}
                />
                <PrimaryButton label="Continue" onPress={submit} loading={loading} />
              </GlassCard>
            </View>
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
    justifyContent: 'center',
    paddingVertical: 16,
    paddingBottom: 32,
  },
  centerBlock: { width: '100%' },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: 16,
    fontWeight: '500',
  },
  email: { color: colors.text, fontWeight: '700' },
});

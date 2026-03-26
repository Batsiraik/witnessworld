import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextField } from '../components/AppTextField';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordOtp'>;

export function ForgotPasswordOtpScreen({ navigation, route }: Props) {
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
      const data = await apiPost('verify-reset-otp.php', { email, otp: cleaned }, false);
      const resetToken = data.reset_token as string | undefined;
      if (!resetToken) throw new Error('No reset token returned');
      navigation.navigate('RecoverPassword', { email, resetToken });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      setError(msg);
      Alert.alert('Reset password', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Enter code" onBack={() => navigation.goBack()} />
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
                We sent a one-time code to{' '}
                <Text style={styles.email}>{email}</Text>. Enter it below to continue.
              </Text>
              <GlassCard>
                <AppTextField
                  label="One-time code"
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

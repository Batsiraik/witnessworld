import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost, setStoredToken } from '../api/client';
import { AuthFormCard } from '../components/AuthFormCard';
import { AuthFormIntro } from '../components/AuthFormIntro';
import { GradientBackground } from '../components/GradientBackground';
import { OtpCodeField } from '../components/OtpCodeField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { authFormStyles } from '../theme/authForm';
type Props = NativeStackScreenProps<RootStackParamList, 'RegisterOtp'>;

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
            </AuthFormCard>
            <Text style={authFormStyles.footerNote}>
              Didn&apos;t receive the code? Check your spam or junk folder — it is sometimes filtered there. You can also go back and confirm your email address is correct.
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
});

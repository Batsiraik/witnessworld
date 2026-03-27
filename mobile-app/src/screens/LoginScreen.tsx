import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPasswordField } from '../components/AppPasswordField';
import { AppTextField } from '../components/AppTextField';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost, setStoredToken } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Enter your email';
    if (!password) next.password = 'Enter your password';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await setStoredToken(null);
      const data = await apiPost(
        'login.php',
        { email: email.trim().toLowerCase(), password },
        false
      );
      const token = data.token as string | undefined;
      const user = data.user as { status?: string } | undefined;
      if (!token) throw new Error('No token returned');
      await setStoredToken(token);
      if (user?.status === 'pending_questions') {
        navigation.reset({ index: 0, routes: [{ name: 'Questionnaire' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      }
    } catch (e) {
      Alert.alert('Log in', e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Log in" onBack={() => navigation.goBack()} />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <GlassCard>
              <AppTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />
              <AppPasswordField
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
              />
              <Pressable
                onPress={() => navigation.navigate('ForgotPasswordEmail')}
                style={styles.forgotWrap}
              >
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
              <PrimaryButton label="Log in" onPress={submit} loading={loading} />
            </GlassCard>
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
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgot: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryDark,
  },
});

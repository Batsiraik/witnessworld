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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPasswordField } from '../components/AppPasswordField';
import { AppTextField } from '../components/AppTextField';
import { AuthFormCard } from '../components/AuthFormCard';
import { AuthFormIntro } from '../components/AuthFormIntro';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost, setStoredToken } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { authFormStyles } from '../theme/authForm';
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
      if (!token) throw new Error('No token returned');
      await setStoredToken(token);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      Alert.alert('Log in', e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader
          title=""
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
            else navigation.navigate('Welcome');
          }}
        />
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
              title="Welcome back"
              subtitle="Sign in with the email and password for your Witness World Connect account."
            />
            <AuthFormCard>
              <AppTextField
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                leftIcon="mail-outline"
                placeholder="you@example.com"
                error={errors.email}
              />
              <AppPasswordField
                label="Password"
                value={password}
                onChangeText={setPassword}
                autoComplete="password"
                textContentType="password"
                placeholder="Your password"
                error={errors.password}
              />
              <Pressable
                onPress={() => navigation.navigate('ForgotPasswordEmail')}
                style={authFormStyles.linkBtn}
              >
                <Text style={authFormStyles.linkBtnText}>Forgot password?</Text>
              </Pressable>
              <PrimaryButton label="Log in" onPress={submit} loading={loading} />
            </AuthFormCard>
            <Text style={authFormStyles.footerNote}>
              New here?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => navigation.navigate('Register')}
              >
                Create an account
              </Text>
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
  footerLink: { color: colors.primaryDark, fontWeight: '800' },
});

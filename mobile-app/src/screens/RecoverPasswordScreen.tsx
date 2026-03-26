import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPasswordField } from '../components/AppPasswordField';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost, setStoredToken } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'RecoverPassword'>;

export function RecoverPasswordScreen({ navigation, route }: Props) {
  const { email, resetToken } = route.params;
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: typeof errors = {};
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      const data = await apiPost(
        'reset-password.php',
        { email, reset_token: resetToken, password, confirm_password: confirm },
        false
      );
      const token = data.token as string | undefined;
      if (!token) throw new Error('No session token returned');
      await setStoredToken(token);
      const user = data.user as { status?: string } | undefined;
      if (user?.status === 'pending_questions') {
        navigation.reset({ index: 0, routes: [{ name: 'Questionnaire' }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      }
    } catch (e) {
      Alert.alert('New password', e instanceof Error ? e.message : 'Could not reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="New password" onBack={() => navigation.goBack()} />
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
                Choose a new password for your account. You’ll go straight to your dashboard after
                this step.
              </Text>
              <GlassCard>
                <AppPasswordField
                  label="New password"
                  value={password}
                  onChangeText={setPassword}
                  error={errors.password}
                />
                <AppPasswordField
                  label="Confirm password"
                  value={confirm}
                  onChangeText={setConfirm}
                  error={errors.confirm}
                />
                <PrimaryButton label="Save & continue" onPress={submit} loading={loading} />
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
});

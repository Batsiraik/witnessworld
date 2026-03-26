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
import { DialCodePicker } from '../components/DialCodePicker';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost } from '../api/client';
import { DEFAULT_DIAL, type DialCountry } from '../constants/dialCodes';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCountry, setDialCountry] = useState<DialCountry>(DEFAULT_DIAL);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);

  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const next: Record<string, string | undefined> = {};
    if (!firstName.trim()) next.firstName = 'Enter your first name';
    if (!lastName.trim()) next.lastName = 'Enter your last name';
    if (!email.trim()) next.email = 'Enter your email';
    if (!phoneLocal.trim()) next.phone = 'Enter your phone number';
    if (!username.trim()) next.username = 'Choose a username';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    if (!agreed) next.agree = 'Please accept the Privacy Policy to continue';
    setErrors(next);
    if (Object.keys(next).length) return;

    const em = email.trim().toLowerCase();
    const phone = `${dialCountry.dial}${phoneLocal.replace(/\D/g, '')}`;
    setLoading(true);
    try {
      await apiPost(
        'register.php',
        {
          email: em,
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim().toLowerCase(),
          phone,
        },
        false
      );
      navigation.navigate('RegisterOtp', { email: em });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Registration failed';
      Alert.alert('Create account', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Create account" onBack={() => navigation.goBack()} />
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
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                error={errors.firstName}
              />
              <AppTextField
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                error={errors.lastName}
              />

              {/* TODO (backend): duplicate email check — see submit() comment block */}
              <AppTextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={errors.email}
              />

              <Text style={styles.fieldLabel}>Phone</Text>
              <View style={styles.phoneRow}>
                <DialCodePicker value={dialCountry} onChange={setDialCountry} />
                <AppTextField
                  label=""
                  hideLabel
                  value={phoneLocal}
                  onChangeText={setPhoneLocal}
                  keyboardType="phone-pad"
                  placeholder="Phone number"
                  error={errors.phone}
                />
              </View>

              {/* TODO (backend): unique username, immutable after signup — see submit() comment block */}
              <AppTextField
                label="Username"
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Unique — cannot be changed later"
                error={errors.username}
              />

              <AppPasswordField
                label="Password"
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

              <View style={styles.agreeRow}>
                <Pressable
                  onPress={() => setAgreed((a) => !a)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed }}
                  hitSlop={6}
                >
                  <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                    {agreed ? <Text style={styles.checkmark}>✓</Text> : null}
                  </View>
                </Pressable>
                <Text style={styles.agreeText}>
                  I understand and agree that my information will be used in accordance with the{' '}
                  <Text
                    style={styles.link}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                  >
                    Privacy Policy
                  </Text>{' '}
                  to process my order securely.
                </Text>
              </View>
              {errors.agree ? <Text style={styles.agreeError}>{errors.agree}</Text> : null}

              <PrimaryButton label="Create account" onPress={submit} loading={loading} />
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
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    marginTop: -4,
  },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16 },
  agreeRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginTop: 8, marginBottom: 20 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(31, 170, 242, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  checkmark: { color: colors.white, fontSize: 13, fontWeight: '800' },
  agreeText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.textMuted, fontWeight: '500' },
  link: { color: colors.primaryDark, fontWeight: '700', textDecorationLine: 'underline' },
  agreeError: { color: colors.danger, fontSize: 12, fontWeight: '600', marginBottom: 12, marginTop: -12 },
});

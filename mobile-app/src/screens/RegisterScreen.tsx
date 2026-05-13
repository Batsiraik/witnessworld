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
import { AppPasswordField } from '../components/AppPasswordField';
import { AppTextField } from '../components/AppTextField';
import { DialCodePicker } from '../components/DialCodePicker';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiPost, setStoredToken } from '../api/client';
import { DEFAULT_DIAL, type DialCountry } from '../constants/dialCodes';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const SIGNUP_PLANS = [
  { key: 'free', title: 'Free', price: '$0', note: 'Browse and message' },
  { key: 'plus', title: 'Plus', price: '$10/mo', note: '1 regular ad after trial' },
  { key: 'starter', title: 'Starter', price: '$25/mo', note: '2 active ads' },
  { key: 'growth', title: 'Growth', price: '$50/mo', note: 'Most Popular' },
  { key: 'elite', title: 'Elite', price: '$150/mo', note: 'Done-For-You' },
] as const;

function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isAtLeast18(date: Date): boolean {
  const now = new Date();
  let age = now.getFullYear() - date.getUTCFullYear();
  const monthDiff = now.getMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getUTCDate())) {
    age -= 1;
  }
  return age >= 18;
}

export function RegisterScreen({ navigation }: Props) {
  useEffect(() => {
    void setStoredToken(null);
  }, []);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCountry, setDialCountry] = useState<DialCountry>(DEFAULT_DIAL);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [memberType, setMemberType] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [congregation, setCongregation] = useState('');
  const [membershipPlan, setMembershipPlan] = useState<(typeof SIGNUP_PLANS)[number]['key']>('free');
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
    const dob = parseDate(dateOfBirth);
    if (!dateOfBirth.trim()) next.dateOfBirth = 'Enter your date of birth';
    else if (!dob) next.dateOfBirth = 'Use YYYY-MM-DD format';
    else if (!isAtLeast18(dob)) next.dateOfBirth = 'You must be at least 18 to sign up';
    if (!memberType.trim()) next.memberType = 'Tell us who you are';
    if (!baptismDate.trim()) next.baptismDate = 'Enter your baptism date';
    else if (!parseDate(baptismDate)) next.baptismDate = 'Use YYYY-MM-DD format';
    if (!congregation.trim()) next.congregation = 'Enter your congregation';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    if (!agreed) {
      next.agree = 'Please confirm you have read and agree to the Privacy Policy and Terms and Conditions.';
    }
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
          date_of_birth: dateOfBirth.trim(),
          member_type: memberType.trim(),
          baptism_date: baptismDate.trim(),
          congregation: congregation.trim(),
          membership_plan: membershipPlan,
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
        <ScreenHeader
          title="Create account"
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Personal information</Text>
                <Text style={styles.sectionHint}>Date of birth is required and the minimum age to sign up is 18.</Text>
              </View>

              <AppTextField
                label="Date of birth"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                error={errors.dateOfBirth}
              />
              <AppTextField
                label="I am a ..."
                value={memberType}
                onChangeText={setMemberType}
                autoCapitalize="words"
                placeholder="Brother, sister, or other"
                error={errors.memberType}
              />
              <AppTextField
                label="Baptism date"
                value={baptismDate}
                onChangeText={setBaptismDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                error={errors.baptismDate}
              />
              <AppTextField
                label="Congregation"
                value={congregation}
                onChangeText={setCongregation}
                autoCapitalize="words"
                error={errors.congregation}
              />

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Membership plan</Text>
                <Text style={styles.sectionHint}>
                  Free needs no card. Paid plans start a trial now; Stripe card collection will be connected before auto-charge.
                </Text>
              </View>
              <View style={styles.planGrid}>
                {SIGNUP_PLANS.map((plan) => {
                  const active = membershipPlan === plan.key;
                  return (
                    <Pressable
                      key={plan.key}
                      onPress={() => setMembershipPlan(plan.key)}
                      style={[styles.planChip, active && styles.planChipOn]}
                    >
                      <Text style={[styles.planName, active && styles.planNameOn]}>{plan.title}</Text>
                      <Text style={[styles.planPrice, active && styles.planPriceOn]}>{plan.price}</Text>
                      <Text style={[styles.planNote, active && styles.planNoteOn]} numberOfLines={2}>
                        {plan.note}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

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
                  I understand and agree to the{' '}
                  <Text style={styles.link} onPress={() => navigation.navigate('PrivacyPolicy')}>
                    Privacy Policy
                  </Text>
                  {' '}and{' '}
                  <Text style={styles.link} onPress={() => navigation.navigate('TermsOfService')}>
                    Terms and Conditions
                  </Text>
                  .
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
  section: { marginTop: 2, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sectionHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '500' },
  planGrid: { gap: 10, marginBottom: 18 },
  planChip: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.78)',
    padding: 13,
  },
  planChipOn: { borderColor: colors.primaryDark, backgroundColor: colors.primarySoft },
  planName: { fontSize: 15, fontWeight: '800', color: colors.text },
  planNameOn: { color: colors.primaryDark },
  planPrice: { marginTop: 2, fontSize: 13, fontWeight: '800', color: colors.goldDark },
  planPriceOn: { color: colors.primaryDark },
  planNote: { marginTop: 3, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  planNoteOn: { color: colors.text },
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

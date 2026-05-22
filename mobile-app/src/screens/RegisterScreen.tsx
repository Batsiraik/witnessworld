import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MutableRefObject, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  type KeyboardEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPasswordField } from '../components/AppPasswordField';
import { AppTextField } from '../components/AppTextField';
import { DialCodePicker } from '../components/DialCodePicker';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SignupPickSheet } from '../components/SignupPickSheet';
import { apiGet, apiPost, setStoredToken } from '../api/client';
import { DEFAULT_DIAL, type DialCountry } from '../constants/dialCodes';
import {
  SIGNUP_MEMBER_ROLES,
  SIGNUP_MIN_AGE,
  isUnbaptizedPublisher,
} from '../constants/signupMemberRoles';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

/** Formats typing into YYYY-MM-DD (digits only, auto-inserts dashes). */
function formatIsoDateAsUserTypes(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const y = digits.slice(0, 4);
  const mo = digits.slice(4, 6);
  const da = digits.slice(6, 8);
  if (digits.length <= 4) return y;
  if (digits.length <= 6) return `${y}-${mo}`;
  return `${y}-${mo}-${da}`;
}

const FIELD_ERROR_ORDER = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'username',
  'dateOfBirth',
  'memberType',
  'baptismDate',
  'congregation',
  'country',
  'password',
  'confirm',
  'agree',
] as const;

function focusFirstValidationError(
  errs: Record<string, string | undefined>,
  refs: MutableRefObject<Partial<Record<(typeof FIELD_ERROR_ORDER)[number], TextInput | null>>>,
  scroll: RefObject<ScrollView | null>
): void {
  for (const key of FIELD_ERROR_ORDER) {
    if (!errs[key]) continue;
    if (key === 'agree') {
      requestAnimationFrame(() => {
        scroll.current?.scrollToEnd({ animated: true });
      });
      return;
    }
    const input = refs.current[key];
    if (input) {
      requestAnimationFrame(() => {
        input.focus();
      });
      return;
    }
  }
}

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

function isAtLeastAge(date: Date, minAge: number): boolean {
  const now = new Date();
  let age = now.getFullYear() - date.getUTCFullYear();
  const monthDiff = now.getMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getUTCDate())) {
    age -= 1;
  }
  return age >= minAge;
}

type SignupCountry = { code: string; name: string };

export function RegisterScreen({ navigation }: Props) {
  useEffect(() => {
    void setStoredToken(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('locations.php', false);
        if (cancelled) return;
        const cs = data.countries;
        if (!Array.isArray(cs)) return;
        const labels: string[] = [];
        const map: Record<string, SignupCountry> = {};
        for (const row of cs) {
          if (row == null || typeof row !== 'object') continue;
          const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
          const name = typeof row.name === 'string' ? row.name.trim() : '';
          if (!code || !name) continue;
          const label = `${name} (${code})`;
          labels.push(label);
          map[label] = { code, name };
        }
        setCountryOptions(labels);
        setCountryNameByLabel(map);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Partial<Record<(typeof FIELD_ERROR_ORDER)[number], TextInput | null>>>({});

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setKeyboardHeight(e.endCoordinates.height);
    const onHide = () => setKeyboardHeight(0);
    const subShow = Keyboard.addListener(showEvt, onShow);
    const subHide = Keyboard.addListener(hideEvt, onHide);
    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, []);

  const scrollPasswordIntoView = () => {
    requestAnimationFrame(() => {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    });
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [dialCountry, setDialCountry] = useState<DialCountry>(DEFAULT_DIAL);
  const [phoneLocal, setPhoneLocal] = useState('');
  const [username, setUsername] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [memberRole, setMemberRole] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [congregation, setCongregation] = useState('');
  const [signupCountry, setSignupCountry] = useState<SignupCountry | null>(null);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [countryNameByLabel, setCountryNameByLabel] = useState<Record<string, SignupCountry>>({});
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
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
    else if (!isAtLeastAge(dob, SIGNUP_MIN_AGE)) {
      next.dateOfBirth = `You must be at least ${SIGNUP_MIN_AGE} to sign up`;
    }
    if (!memberRole.trim()) next.memberType = 'Select your role';
    const unbaptized = isUnbaptizedPublisher(memberRole);
    if (!unbaptized) {
      if (!baptismDate.trim()) next.baptismDate = 'Enter your baptism date';
      else if (!parseDate(baptismDate)) next.baptismDate = 'Use YYYY-MM-DD format';
    } else if (baptismDate.trim() && !parseDate(baptismDate)) {
      next.baptismDate = 'Use YYYY-MM-DD format';
    }
    if (!congregation.trim()) next.congregation = 'Enter your congregation';
    if (!signupCountry?.code) next.country = 'Select your country';
    if (password.length < 8) next.password = 'Use at least 8 characters';
    if (password !== confirm) next.confirm = 'Passwords do not match';
    if (!agreed) {
      next.agree = 'Please confirm you have read and agree to the Privacy Policy and Terms and Conditions.';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      focusFirstValidationError(next, fieldRefs, scrollRef);
      return;
    }

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
          member_type: memberRole.trim(),
          baptism_date: baptismDate.trim(),
          congregation: congregation.trim(),
          registration_country_code: signupCountry!.code,
          membership_plan: 'free',
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
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: 32 + keyboardHeight }]}
          showsVerticalScrollIndicator={false}
        >
            <GlassCard>
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.firstName = el;
                }}
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                error={errors.firstName}
              />
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.lastName = el;
                }}
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                error={errors.lastName}
              />

              {/* TODO (backend): duplicate email check — see submit() comment block */}
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.email = el;
                }}
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
                <View style={styles.dialWrap}>
                  <DialCodePicker value={dialCountry} onChange={setDialCountry} />
                </View>
                <AppTextField
                  ref={(el) => {
                    fieldRefs.current.phone = el;
                  }}
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
                ref={(el) => {
                  fieldRefs.current.username = el;
                }}
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
                <Text style={styles.sectionHint}>
                  Minimum age to sign up is {SIGNUP_MIN_AGE}.
                </Text>
              </View>

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.dateOfBirth = el;
                }}
                label="Date of birth (YYYY-MM-DD)"
                value={dateOfBirth}
                onChangeText={(t) => setDateOfBirth(formatIsoDateAsUserTypes(t))}
                placeholder="2010-01-15"
                keyboardType="numbers-and-punctuation"
                error={errors.dateOfBirth}
              />

              <Text style={styles.fieldLabel}>I am a brother / sister</Text>
              <Pressable
                onPress={() => setRoleSheetOpen(true)}
                style={[styles.selectRow, errors.memberType && styles.selectRowError]}
              >
                <Text style={memberRole ? styles.selectVal : styles.selectPh}>
                  {memberRole || 'Select'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
              {errors.memberType ? <Text style={styles.fieldError}>{errors.memberType}</Text> : null}

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.baptismDate = el;
                }}
                label={
                  isUnbaptizedPublisher(memberRole)
                    ? 'Baptism date (optional, YYYY-MM-DD)'
                    : 'Baptism date (YYYY-MM-DD)'
                }
                value={baptismDate}
                onChangeText={(t) => setBaptismDate(formatIsoDateAsUserTypes(t))}
                placeholder="2010-06-01"
                keyboardType="numbers-and-punctuation"
                error={errors.baptismDate}
              />

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.congregation = el;
                }}
                label="Congregation"
                value={congregation}
                onChangeText={setCongregation}
                autoCapitalize="words"
                error={errors.congregation}
              />

              <Text style={styles.fieldLabel}>Country</Text>
              <Pressable
                onPress={() => setCountrySheetOpen(true)}
                style={[styles.selectRow, errors.country && styles.selectRowError]}
              >
                <Text style={signupCountry ? styles.selectVal : styles.selectPh}>
                  {signupCountry ? `${signupCountry.name} (${signupCountry.code})` : 'Select country'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
              {errors.country ? <Text style={styles.fieldError}>{errors.country}</Text> : null}

              <SignupPickSheet
                visible={roleSheetOpen}
                title="Select role"
                options={[...SIGNUP_MEMBER_ROLES]}
                selected={memberRole || null}
                onSelect={setMemberRole}
                onClose={() => setRoleSheetOpen(false)}
              />
              <SignupPickSheet
                visible={countrySheetOpen}
                title="Select country"
                options={countryOptions}
                selected={
                  signupCountry
                    ? `${signupCountry.name} (${signupCountry.code})`
                    : null
                }
                onSelect={(label) => {
                  const c = countryNameByLabel[label];
                  if (c) setSignupCountry(c);
                }}
                onClose={() => setCountrySheetOpen(false)}
                searchable
                searchPlaceholder="Search countries"
              />

              <AppPasswordField
                ref={(el) => {
                  fieldRefs.current.password = el;
                }}
                label="Password"
                value={password}
                onChangeText={setPassword}
                error={errors.password}
                onFocus={scrollPasswordIntoView}
              />
              <AppPasswordField
                ref={(el) => {
                  fieldRefs.current.confirm = el;
                }}
                label="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                error={errors.confirm}
                onFocus={scrollPasswordIntoView}
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
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
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
  dialWrap: { flexShrink: 0 },
  section: { marginTop: 2, marginBottom: 14 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  sectionHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '500' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    marginBottom: 16,
  },
  selectRowError: { borderColor: colors.danger },
  selectVal: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 15, color: colors.textMuted, fontWeight: '500' },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: -12,
    marginBottom: 14,
  },
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

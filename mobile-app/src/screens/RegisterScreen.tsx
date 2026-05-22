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
import { AppSelectField } from '../components/AppSelectField';
import { AuthFormCard } from '../components/AuthFormCard';
import { AuthFormIntro } from '../components/AuthFormIntro';
import { AuthFormSection } from '../components/AuthFormSection';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { SignupPickSheet } from '../components/SignupPickSheet';
import { authFormStyles } from '../theme/authForm';
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
          title=""
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
          <AuthFormIntro
            title="Create your account"
            subtitle="Join Witness World Connect. After signup you will verify your email, then access the app while your profile is reviewed."
          />
          <AuthFormCard>
            <AuthFormSection title="Account">
              <View style={authFormStyles.row2}>
                <View style={authFormStyles.row2Cell}>
                  <AppTextField
                    ref={(el) => {
                      fieldRefs.current.firstName = el;
                    }}
                    label="First name"
                    value={firstName}
                    onChangeText={setFirstName}
                    autoCapitalize="words"
                    leftIcon="person-outline"
                    error={errors.firstName}
                  />
                </View>
                <View style={authFormStyles.row2Cell}>
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
                </View>
              </View>

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.email = el;
                }}
                label="Email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="mail-outline"
                placeholder="you@example.com"
                error={errors.email}
              />

              <Text style={styles.phoneLabel}>MOBILE NUMBER</Text>
              <View style={styles.phoneRow}>
                <DialCodePicker value={dialCountry} onChange={setDialCountry} />
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

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.username = el;
                }}
                label="Username"
                value={username}
                onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
                autoCapitalize="none"
                autoCorrect={false}
                leftIcon="at-outline"
                hint="Permanent — cannot be changed later"
                placeholder="yourname"
                error={errors.username}
              />
            </AuthFormSection>

            <AuthFormSection
              title="Congregation"
              hint={`You must be at least ${SIGNUP_MIN_AGE} years old to register.`}
            >
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.dateOfBirth = el;
                }}
                label="Date of birth"
                value={dateOfBirth}
                onChangeText={(t) => setDateOfBirth(formatIsoDateAsUserTypes(t))}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                leftIcon="calendar-outline"
                hint="Format: 2010-01-15"
                error={errors.dateOfBirth}
              />

              <AppSelectField
                label="I am a brother / sister"
                value={memberRole}
                placeholder="Select your role"
                onPress={() => setRoleSheetOpen(true)}
                error={errors.memberType}
                icon="people-outline"
              />

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.baptismDate = el;
                }}
                label="Baptism date"
                value={baptismDate}
                onChangeText={(t) => setBaptismDate(formatIsoDateAsUserTypes(t))}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
                leftIcon="water-outline"
                hint={
                  isUnbaptizedPublisher(memberRole) ? 'Optional for unbaptized publishers' : undefined
                }
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
                leftIcon="home-outline"
                placeholder="Your congregation name"
                error={errors.congregation}
              />

              <AppSelectField
                label="Country"
                value={signupCountry ? signupCountry.name : ''}
                placeholder="Select country"
                onPress={() => setCountrySheetOpen(true)}
                error={errors.country}
                icon="earth-outline"
              />

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
            </AuthFormSection>

            <AuthFormSection title="Security">
              <AppPasswordField
                ref={(el) => {
                  fieldRefs.current.password = el;
                }}
                label="Password"
                value={password}
                onChangeText={setPassword}
                hint="At least 8 characters"
                placeholder="Create a password"
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
                placeholder="Re-enter password"
                error={errors.confirm}
                onFocus={scrollPasswordIntoView}
              />

              <View style={styles.legalBox}>
                <Pressable
                  onPress={() => setAgreed((a) => !a)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: agreed }}
                  hitSlop={8}
                >
                  <View style={[styles.checkbox, agreed && styles.checkboxOn]}>
                    {agreed ? <Ionicons name="checkmark" size={14} color={colors.white} /> : null}
                  </View>
                </Pressable>
                <Text style={styles.agreeText}>
                  I agree to the{' '}
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
            </AuthFormSection>

            <PrimaryButton label="Create account" onPress={submit} loading={loading} />
          </AuthFormCard>
          <Text style={authFormStyles.footerNote}>
            Already have an account?{' '}
            <Text style={styles.footerLink} onPress={() => navigation.navigate('Login')}>
              Log in
            </Text>
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  scroll: {
    flexGrow: 1,
    paddingTop: 4,
    paddingBottom: 32,
  },
  phoneLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  phoneRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 16 },
  legalBox: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    marginTop: 4,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 170, 242, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.12)',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    backgroundColor: colors.white,
  },
  checkboxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  agreeText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.text, fontWeight: '500' },
  link: { color: colors.primaryDark, fontWeight: '800' },
  agreeError: { color: colors.danger, fontSize: 12, fontWeight: '600', marginBottom: 12, marginTop: 8 },
  footerLink: { color: colors.primaryDark, fontWeight: '800' },
});

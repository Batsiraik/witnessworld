import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MutableRefObject, RefObject } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppPasswordField } from '../components/AppPasswordField';
import { AppTextField } from '../components/AppTextField';
import { DialCodePicker } from '../components/DialCodePicker';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { apiGet, apiPost, setStoredToken } from '../api/client';
import {
  MEMBERSHIP_PLANS_FALLBACK,
  MEMBERSHIP_TRIAL_DAYS_FALLBACK,
  type PublicPlan,
} from '../constants/membershipPlansFallback';
import { DEFAULT_DIAL, type DialCountry } from '../constants/dialCodes';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const VALID_PLAN_KEYS = ['free', 'plus', 'starter', 'growth', 'elite'] as const;
type PlanKey = (typeof VALID_PLAN_KEYS)[number];

function isPlanKey(k: string): k is PlanKey {
  return (VALID_PLAN_KEYS as readonly string[]).includes(k);
}

function parsePublicPlans(raw: unknown): PublicPlan[] | null {
  if (!Array.isArray(raw)) return null;
  const out: PublicPlan[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue;
    const p = row as Record<string, unknown>;
    const key = typeof p.key === 'string' ? p.key : '';
    if (!isPlanKey(key)) continue;
    const title = typeof p.title === 'string' ? p.title : key;
    const price = typeof p.price === 'number' ? p.price : Number(p.price);
    const badge = typeof p.badge === 'string' ? p.badge : undefined;
    const features = Array.isArray(p.features)
      ? p.features.filter((x): x is string => typeof x === 'string')
      : [];
    out.push({ key, title, price: Number.isFinite(price) ? price : 0, badge, features });
  }
  return out.length ? out : null;
}

function formatIllustrativeTrialEnd(trialDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + Math.max(0, trialDays));
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

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
  const [memberType, setMemberType] = useState('');
  const [baptismDate, setBaptismDate] = useState('');
  const [congregation, setCongregation] = useState('');
  const [membershipPlan, setMembershipPlan] = useState<PlanKey>('free');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [loading, setLoading] = useState(false);

  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [trialDays, setTrialDays] = useState(MEMBERSHIP_TRIAL_DAYS_FALLBACK);
  const [plansLoading, setPlansLoading] = useState(true);

  const illustrationEnd = useMemo(() => formatIllustrativeTrialEnd(trialDays), [trialDays]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setPlansLoading(true);
      try {
        const data = await apiGet('membership-plans-public.php', false);
        if (cancelled) return;
        const parsed = parsePublicPlans(data.plans);
        if (data.ok === true && parsed) {
          setPlans(parsed);
          const td = typeof data.trial_days === 'number' ? data.trial_days : Number(data.trial_days);
          if (Number.isFinite(td) && td >= 0) setTrialDays(Math.min(365, Math.max(0, td)));
        } else {
          setPlans(MEMBERSHIP_PLANS_FALLBACK);
          setTrialDays(MEMBERSHIP_TRIAL_DAYS_FALLBACK);
        }
      } catch {
        if (!cancelled) {
          setPlans(MEMBERSHIP_PLANS_FALLBACK);
          setTrialDays(MEMBERSHIP_TRIAL_DAYS_FALLBACK);
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
                <Text style={styles.sectionHint}>Date of birth is required and the minimum age to sign up is 18.</Text>
              </View>

              <AppTextField
                ref={(el) => {
                  fieldRefs.current.dateOfBirth = el;
                }}
                label="Date of birth (YYYY-MM-DD)"
                value={dateOfBirth}
                onChangeText={(t) => setDateOfBirth(formatIsoDateAsUserTypes(t))}
                placeholder="2000-01-15"
                keyboardType="numbers-and-punctuation"
                error={errors.dateOfBirth}
              />
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.memberType = el;
                }}
                label="I am a ..."
                value={memberType}
                onChangeText={setMemberType}
                autoCapitalize="words"
                placeholder="Brother, sister, or other"
                error={errors.memberType}
              />
              <AppTextField
                ref={(el) => {
                  fieldRefs.current.baptismDate = el;
                }}
                label="Baptism date (YYYY-MM-DD)"
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

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Membership plan</Text>
                {plansLoading ? (
                  <View style={styles.plansLoadingRow}>
                    <ActivityIndicator color={colors.primary} />
                    <Text style={styles.sectionHint}>Loading plans…</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.trialIntro}>
                      <Text style={styles.trialBold}>Free</Text>
                      {' is $0/month — no subscription billing and '}
                      <Text style={styles.trialBold}>no card</Text>
                      {' is collected. After you verify your email, you go straight into the app.'}
                    </Text>
                    <Text style={[styles.trialIntro, { marginTop: 10 }]}>
                      <Text style={styles.trialBold}>Paid plans</Text>
                      {' start your '}
                      <Text style={styles.trialBold}>{trialDays}-day free trial</Text>
                      {' when you create the account. '}
                      <Text style={styles.trialBold}>You are not charged</Text>
                      {' until after that trial ends. Right after email verification you go straight to the '}
                      <Text style={styles.trialBold}>add card</Text>
                      {' screen (or you can switch to Free there). Use Stripe test card 4242 4242 4242 4242 with any future expiry and any CVC while the server is in test mode.'}
                    </Text>
                    <Text style={[styles.trialIntro, { marginTop: 10 }]}>
                      Your exact trial end date appears in the app after signup. Illustration only — last free day
                      if the trial started today: <Text style={styles.trialBold}>{illustrationEnd}</Text>.
                    </Text>
                    <Text style={[styles.sectionHint, { marginTop: 10 }]}>
                      Optional storefront add-on is chosen later from Create listing (not here).
                    </Text>
                  </>
                )}
              </View>

              {!plansLoading &&
                plans.map((plan) => {
                  const active = membershipPlan === plan.key;
                  return (
                    <Pressable
                      key={plan.key}
                      onPress={() => {
                        if (isPlanKey(plan.key)) setMembershipPlan(plan.key);
                      }}
                      style={[styles.planCard, active && styles.planCardOn]}
                    >
                      <View style={styles.planCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.planCardTitle}>{plan.title}</Text>
                          <Text style={styles.planCardPrice}>
                            {plan.price === 0 ? '$0/month' : `$${plan.price}/month after trial`}
                          </Text>
                        </View>
                        {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                      </View>
                      {(plan.features ?? []).map((f) => (
                        <Text key={f} style={styles.planFeature}>
                          • {f}
                        </Text>
                      ))}
                      <View style={[styles.planSelectPill, active && styles.planSelectPillOn]}>
                        <Text style={[styles.planSelectText, active && styles.planSelectTextOn]}>
                          {active ? 'Your selection' : 'Tap to select'}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

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
  plansLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    marginTop: 4,
  },
  trialIntro: { fontSize: 13, lineHeight: 20, color: colors.textMuted, fontWeight: '500' },
  trialBold: { fontWeight: '800', color: colors.text },
  planCard: {
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 14,
  },
  planCardOn: { borderColor: colors.primaryDark, backgroundColor: colors.primarySoft },
  planCardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  planCardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  planCardPrice: { marginTop: 3, fontSize: 12, fontWeight: '800', color: colors.textMuted },
  planBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: colors.goldSoft,
    color: colors.goldDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  planFeature: { marginTop: 6, fontSize: 12, lineHeight: 17, fontWeight: '600', color: colors.textMuted },
  planSelectPill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(11,18,32,0.06)',
  },
  planSelectPillOn: { backgroundColor: colors.primary },
  planSelectText: { fontSize: 12, fontWeight: '800', color: colors.textMuted },
  planSelectTextOn: { color: colors.white },
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

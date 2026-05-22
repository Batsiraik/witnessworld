import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextStyle,
} from 'react-native';
import type { RegistrationPollPayload } from '../api/client';
import { isRegistrationPollComplete } from '../utils/registrationPoll';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';

export type RegistrationAccountType = 'individual' | 'business';
export type RegistrationPrimaryPurpose = 'browsing_connecting' | 'promoting_business' | 'both';
export type RegistrationReferralSource =
  | 'friend_family'
  | 'social_media'
  | 'whatsapp_group'
  | 'wwc_team_member'
  | 'other';

type PollUser = {
  registration_account_type?: RegistrationAccountType | null;
  registration_primary_purpose?: RegistrationPrimaryPurpose | null;
  registration_referral_source?: RegistrationReferralSource | null;
  registration_referral_other?: string | null;
};

type Props = {
  visible: boolean;
  variant: 'pending' | 'declined';
  supportEmail: string;
  user?: PollUser | null;
  onSubmitPoll?: (payload: RegistrationPollPayload) => Promise<void>;
  supportAvailable?: boolean;
  onMessageSupport?: () => void;
};

type RadioOption<V extends string> = { value: V; label: string; hint?: string };

const ACCOUNT_OPTIONS: RadioOption<RegistrationAccountType>[] = [
  {
    value: 'individual',
    label: 'Individual',
    hint: 'Browse listings, shop the marketplace, find housing/services, and connect',
  },
  {
    value: 'business',
    label: 'Business',
    hint: 'Promote your business, create a storefront, list professional services, and network',
  },
];

const PURPOSE_OPTIONS: RadioOption<RegistrationPrimaryPurpose>[] = [
  {
    value: 'browsing_connecting',
    label: 'Browsing & Connecting',
    hint: 'Explore the marketplace, rentals, roommate finder, and professional services',
  },
  {
    value: 'promoting_business',
    label: 'Promoting a Business or Service',
    hint: 'Showcase your business directory listing, digital services, or storefront',
  },
  {
    value: 'both',
    label: 'Both',
    hint: 'I want to utilize the platform to both offer services/goods and browse other listings',
  },
];

const REFERRAL_OPTIONS: { value: RegistrationReferralSource; label: string }[] = [
  { value: 'friend_family', label: 'Friend / Family' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'whatsapp_group', label: 'WhatsApp Group' },
  { value: 'wwc_team_member', label: 'WWC Team Member' },
  { value: 'other', label: 'Other' },
];

function PollRadioGroup<V extends string>({
  options,
  selected,
  onSelect,
}: {
  options: RadioOption<V>[];
  selected: V | null;
  onSelect: (v: V) => void;
}) {
  return (
    <>
      {options.map((opt) => {
        const on = selected === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={({ pressed }) => [
              styles.optionRow,
              on && styles.optionRowOn,
              pressed && styles.optionRowPressed,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
          >
            <View style={[styles.radioOuter, on && styles.radioOuterOn]}>
              {on ? <View style={styles.radioInner} /> : null}
            </View>
            <View style={styles.optionTextWrap}>
              <Text style={styles.optionLabel}>{opt.label}</Text>
              {opt.hint ? <Text style={styles.optionHint}>{opt.hint}</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </>
  );
}

export function VerificationLockOverlay({
  visible,
  variant,
  supportEmail,
  user,
  onSubmitPoll,
  supportAvailable,
  onMessageSupport,
}: Props) {
  const [accountType, setAccountType] = useState<RegistrationAccountType | null>(null);
  const [primaryPurpose, setPrimaryPurpose] = useState<RegistrationPrimaryPurpose | null>(null);
  const [referralSource, setReferralSource] = useState<RegistrationReferralSource | null>(null);
  const [referralOther, setReferralOther] = useState('');
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const pollDone = isRegistrationPollComplete(user ?? null);
  const showPoll = variant === 'pending' && !pollDone && onSubmitPoll;

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSubmitError('');
      return;
    }
    setAccountType(user?.registration_account_type ?? null);
    setPrimaryPurpose(user?.registration_primary_purpose ?? null);
    setReferralSource(user?.registration_referral_source ?? null);
    setReferralOther(user?.registration_referral_other ?? '');
  }, [visible, user]);

  const title = variant === 'declined' ? 'Account not approved' : 'Waiting for verification';
  const body =
    variant === 'declined'
      ? 'Your registration was not approved. For further details, contact:'
      : 'Verification will take up to 24 hours. If it takes longer, please contact admin at:';

  const emailStyle: TextStyle =
    variant === 'declined' ? styles.emailDeclined : styles.emailPending;

  const canSubmit =
    accountType &&
    primaryPurpose &&
    referralSource &&
    (referralSource !== 'other' || referralOther.trim().length >= 2);

  const submitPoll = async () => {
    if (!canSubmit || !onSubmitPoll || submitBusy) return;
    setSubmitBusy(true);
    setSubmitError('');
    try {
      await onSubmitPoll({
        account_type: accountType,
        primary_purpose: primaryPurpose,
        referral_source: referralSource,
        referral_other: referralSource === 'other' ? referralOther.trim() : undefined,
      });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Please try again.');
    } finally {
      setSubmitBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        /* not closable */
      }}
    >
      <View style={styles.fill} pointerEvents="auto">
        {Platform.OS === 'ios' ? (
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.androidScrim]} />
        )}
        <View style={styles.centerWrap} pointerEvents="box-none">
          <View style={styles.card}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.title}>{title}</Text>

              {showPoll ? (
                <>
                  <Text style={styles.pollIntro}>
                    To help us review your account, please answer these quick questions.
                  </Text>

                  <Text style={styles.pollSection}>1. Account type</Text>
                  <Text style={styles.pollQuestion}>
                    Are you registering as an Individual or a Business?{' '}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <PollRadioGroup
                    options={ACCOUNT_OPTIONS}
                    selected={accountType}
                    onSelect={setAccountType}
                  />

                  <Text style={styles.pollSection}>2. Primary purpose</Text>
                  <Text style={styles.pollQuestion}>
                    What is the primary purpose of your registration?{' '}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <PollRadioGroup
                    options={PURPOSE_OPTIONS}
                    selected={primaryPurpose}
                    onSelect={setPrimaryPurpose}
                  />

                  <Text style={styles.pollSection}>3. Referral</Text>
                  <Text style={styles.pollQuestion}>
                    How did you hear about Witness World Connect (WWC)?{' '}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  {REFERRAL_OPTIONS.map((opt) => {
                    const on = referralSource === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setReferralSource(opt.value)}
                        style={({ pressed }) => [
                          styles.optionRow,
                          on && styles.optionRowOn,
                          pressed && styles.optionRowPressed,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: on }}
                      >
                        <View style={[styles.radioOuter, on && styles.radioOuterOn]}>
                          {on ? <View style={styles.radioInner} /> : null}
                        </View>
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                      </Pressable>
                    );
                  })}
                  {referralSource === 'other' ? (
                    <TextInput
                      value={referralOther}
                      onChangeText={setReferralOther}
                      placeholder="Please specify"
                      placeholderTextColor={colors.textMuted}
                      style={styles.otherInput}
                      maxLength={200}
                      accessibilityLabel="Other referral source"
                    />
                  ) : null}

                  {submitError ? <Text style={styles.pollError}>{submitError}</Text> : null}
                  <PrimaryButton
                    label="Continue"
                    loading={submitBusy}
                    disabled={!canSubmit}
                    onPress={() => void submitPoll()}
                    style={styles.pollSubmit}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.body}>{body}</Text>
                  <Text style={emailStyle}>{supportEmail}</Text>
                  {supportAvailable && onMessageSupport ? (
                    <Pressable
                      onPress={onMessageSupport}
                      style={({ pressed }) => [styles.supportChatBtn, pressed && styles.supportChatBtnPressed]}
                      accessibilityLabel="Open Customer Support chat"
                    >
                      <Text style={styles.supportChatBtnText}>Message Customer Support</Text>
                    </Pressable>
                  ) : null}
                  <Text style={styles.hint}>
                    This message will clear once an admin has verified your account.
                  </Text>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  androidScrim: { backgroundColor: 'rgba(11, 18, 32, 0.88)' },
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 22,
    maxHeight: '90%',
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.35)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  pollIntro: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 12,
  },
  pollSection: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pollQuestion: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  required: { color: colors.danger },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    marginBottom: 7,
  },
  optionRowOn: {
    borderColor: 'rgba(31, 170, 242, 0.45)',
    backgroundColor: 'rgba(31, 170, 242, 0.06)',
  },
  optionRowPressed: { opacity: 0.92 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioOuterOn: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  optionTextWrap: { flex: 1 },
  optionLabel: { fontSize: 12, fontWeight: '700', color: colors.text, flex: 1 },
  optionHint: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  otherInput: {
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: colors.text,
    backgroundColor: '#fff',
  },
  pollError: {
    marginTop: 6,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  pollSubmit: { marginTop: 12, marginBottom: 4 },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  emailPending: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    color: '#c2410c',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  emailDeclined: {
    marginTop: 14,
    fontSize: 16,
    fontWeight: '800',
    color: colors.danger,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  hint: {
    marginTop: 18,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  supportChatBtn: {
    marginTop: 16,
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: colors.primaryDark,
  },
  supportChatBtnPressed: { opacity: 0.9 },
  supportChatBtnText: { fontSize: 15, fontWeight: '800', color: colors.white, textAlign: 'center' },
});

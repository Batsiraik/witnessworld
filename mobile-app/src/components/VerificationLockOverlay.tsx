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
  View,
  type TextStyle,
} from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';

export type RegistrationAccountType = 'individual' | 'business';

type Props = {
  visible: boolean;
  variant: 'pending' | 'declined';
  supportEmail: string;
  registrationAccountType?: RegistrationAccountType | null;
  onSubmitAccountType?: (type: RegistrationAccountType) => Promise<void>;
  supportAvailable?: boolean;
  onMessageSupport?: () => void;
};

const POLL_OPTIONS: { value: RegistrationAccountType; label: string; hint: string }[] = [
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

export function VerificationLockOverlay({
  visible,
  variant,
  supportEmail,
  registrationAccountType,
  onSubmitAccountType,
  supportAvailable,
  onMessageSupport,
}: Props) {
  const [selected, setSelected] = useState<RegistrationAccountType | null>(null);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const pollDone = Boolean(registrationAccountType);
  const showPoll = variant === 'pending' && !pollDone && onSubmitAccountType;

  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      setSubmitError('');
    }
  }, [visible]);

  const title = variant === 'declined' ? 'Account not approved' : 'Waiting for verification';
  const body =
    variant === 'declined'
      ? 'Your registration was not approved. For further details, contact:'
      : 'Verification will take up to 24 hours. If it takes longer, please contact admin at:';

  const emailStyle: TextStyle =
    variant === 'declined' ? styles.emailDeclined : styles.emailPending;

  const submitPoll = async () => {
    if (!selected || !onSubmitAccountType || submitBusy) return;
    setSubmitBusy(true);
    setSubmitError('');
    try {
      await onSubmitAccountType(selected);
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
                    To help us review your account, please answer one quick question.
                  </Text>
                  <Text style={styles.pollQuestion}>
                    Are you registering as an Individual or a Business?{' '}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  {POLL_OPTIONS.map((opt) => {
                    const on = selected === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        onPress={() => setSelected(opt.value)}
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
                          <Text style={styles.optionHint}>{opt.hint}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                  {submitError ? <Text style={styles.pollError}>{submitError}</Text> : null}
                  <PrimaryButton
                    label="Continue"
                    loading={submitBusy}
                    disabled={!selected}
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
    paddingHorizontal: 24,
  },
  card: {
    borderRadius: 22,
    maxHeight: '88%',
    padding: 22,
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
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  pollIntro: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 14,
  },
  pollQuestion: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },
  required: { color: colors.danger },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    marginBottom: 8,
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
  optionLabel: { fontSize: 12, fontWeight: '700', color: colors.text },
  optionHint: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    fontWeight: '500',
  },
  pollError: {
    marginTop: 6,
    fontSize: 12,
    color: colors.danger,
    textAlign: 'center',
    fontWeight: '600',
  },
  pollSubmit: { marginTop: 14 },
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

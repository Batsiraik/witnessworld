import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  variant: 'pending' | 'declined';
  supportEmail: string;
  /** Re-fetches account status from the server (e.g. after admin approval). */
  onRecheckStatus?: () => Promise<void>;
};

export function VerificationLockOverlay({ visible, variant, supportEmail, onRecheckStatus }: Props) {
  const [recheckBusy, setRecheckBusy] = useState(false);
  useEffect(() => {
    if (!visible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [visible]);

  const title = variant === 'declined' ? 'Account not approved' : 'Waiting for verification';
  const body =
    variant === 'declined'
      ? 'Your registration was not approved. For further details, contact:'
      : 'Verification will take up to 24 hours. If it takes longer, please contact admin at:';

  const emailStyle: TextStyle =
    variant === 'declined' ? styles.emailDeclined : styles.emailPending;

  const recheck = async () => {
    if (!onRecheckStatus || recheckBusy) return;
    setRecheckBusy(true);
    try {
      await onRecheckStatus();
    } finally {
      setRecheckBusy(false);
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
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            <Text style={emailStyle}>{supportEmail}</Text>
            <Text style={styles.hint}>This message will clear once an admin has verified your account.</Text>
            {onRecheckStatus ? (
              <PrimaryButton
                label="Check status"
                loading={recheckBusy}
                onPress={() => void recheck()}
                style={styles.recheckBtn}
              />
            ) : null}
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
    padding: 24,
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
  recheckBtn: { marginTop: 20 },
});

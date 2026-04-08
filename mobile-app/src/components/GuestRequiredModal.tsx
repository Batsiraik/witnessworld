import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  onDismiss: () => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
};

export function GuestRequiredModal({
  visible,
  title = 'Account required',
  message = 'Create an account or sign in to continue.',
  onDismiss,
  onSignIn,
  onCreateAccount,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{message}</Text>
          <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onCreateAccount}>
            <Text style={styles.btnPrimaryText}>Create account</Text>
          </Pressable>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onSignIn}>
            <Text style={styles.btnSecondaryText}>Sign in</Text>
          </Pressable>
          <Pressable style={styles.link} onPress={onDismiss} hitSlop={12}>
            <Text style={styles.linkText}>Continue browsing</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 22,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 22, marginBottom: 20, fontWeight: '500' },
  btn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimary: { backgroundColor: colors.primaryDark },
  btnPrimaryText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  btnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.12)',
  },
  btnSecondaryText: { color: colors.text, fontSize: 16, fontWeight: '700' },
  link: { alignItems: 'center', paddingTop: 6 },
  linkText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
});

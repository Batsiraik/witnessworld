import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function ReportSheet({ visible, title, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const t = reason.trim();
    if (t.length < 3) {
      Alert.alert('Report', 'Please enter a bit more detail (at least a few characters).');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(t);
      setReason('');
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.hint}>Describe what is wrong. Our team will review.</Text>
          <TextInput
            style={styles.input}
            placeholder="Reason for report…"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={5}
            value={reason}
            onChangeText={setReason}
            textAlignVertical="top"
          />
          <PrimaryButton label={busy ? 'Sending…' : 'Submit report'} onPress={() => void submit()} loading={busy} />
          <Pressable onPress={onClose} style={styles.cancel} disabled={busy}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          {busy ? <ActivityIndicator style={styles.spin} color={colors.primary} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
    paddingBottom: 32,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.textMuted, fontWeight: '500' },
  input: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.1)',
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  cancel: { alignItems: 'center', paddingVertical: 8 },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  spin: { marginTop: 8 },
});

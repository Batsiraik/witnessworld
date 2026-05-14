import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  type KeyboardEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { PrimaryButton } from './PrimaryButton';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
};

export function ReportSheet({ visible, title, onClose, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

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

  useEffect(() => {
    if (!visible) {
      setKeyboardHeight(0);
      Keyboard.dismiss();
    }
  }, [visible]);

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

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
      Keyboard.dismiss();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const sheetBottomPad = Math.max(28, insets.bottom + 12);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.root}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            Keyboard.dismiss();
            handleClose();
          }}
        />
        <View style={[styles.sheetLift, { paddingBottom: keyboardHeight }]} pointerEvents="box-none">
          <Pressable style={[styles.sheet, { paddingBottom: sheetBottomPad }]} onPress={(e) => e.stopPropagation()}>
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
            <Pressable onPress={handleClose} style={styles.cancel} disabled={busy}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            {busy ? <ActivityIndicator style={styles.spin} color={colors.primary} /> : null}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(11,18,32,0.45)',
    justifyContent: 'flex-end',
  },
  sheetLift: {
    width: '100%',
  },
  sheet: {
    width: '100%',
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 22,
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
  cancel: { alignItems: 'center', paddingVertical: 10, marginBottom: 4 },
  cancelText: { fontSize: 16, fontWeight: '700', color: colors.textMuted },
  spin: { marginTop: 8 },
});

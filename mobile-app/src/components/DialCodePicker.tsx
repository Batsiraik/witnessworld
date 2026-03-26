import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { DialCountry } from '../constants/dialCodes';
import { DIAL_COUNTRIES } from '../constants/dialCodes';
import { colors } from '../theme/colors';

type Props = {
  value: DialCountry;
  onChange: (c: DialCountry) => void;
};

export function DialCodePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const filtered = DIAL_COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q.trim().toLowerCase()) ||
      c.dial.includes(q.trim())
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && { opacity: 0.9 }]}
      >
        <Text style={styles.flag}>{value.flag}</Text>
        <Text style={styles.dial}>{value.dial}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Country code</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search country or code"
            placeholderTextColor={colors.textMuted}
            style={styles.search}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => `${item.name}-${item.dial}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.item}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                  setQ('');
                }}
              >
                <Text style={styles.itemFlag}>{item.flag}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDial}>{item.dial}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.25)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    minWidth: 100,
  },
  flag: { fontSize: 18 },
  dial: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  modalSafe: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  done: { fontSize: 16, fontWeight: '700', color: colors.primary },
  search: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
    gap: 10,
  },
  itemFlag: { fontSize: 20, width: 36 },
  itemName: { flex: 1, fontSize: 16, color: colors.text },
  itemDial: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
});

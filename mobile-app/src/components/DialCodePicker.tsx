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

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <SafeAreaView style={styles.modalSafe} edges={['bottom']}>
              <View style={styles.handle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Country code</Text>
              </View>
              <TextInput
                value={q}
                onChangeText={setQ}
                placeholder="Search country or code"
                placeholderTextColor={colors.textMuted}
                style={styles.search}
              />
              <FlatList
                style={styles.list}
                contentContainerStyle={styles.listContent}
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
          </Pressable>
        </Pressable>
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
    width: 112,
  },
  flag: { fontSize: 17 },
  dial: { fontSize: 13, fontWeight: '800', color: colors.text, flex: 1 },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(11,18,32,0.35)',
  },
  sheet: {
    height: '72%',
    marginHorizontal: 12,
    marginBottom: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.white,
  },
  modalSafe: { flex: 1, backgroundColor: colors.white },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginTop: 10,
    marginBottom: 2,
  },
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
  list: { flex: 1 },
  listContent: { paddingBottom: 18 },
  itemFlag: { fontSize: 20, width: 36 },
  itemName: { flex: 1, fontSize: 16, color: colors.text },
  itemDial: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
});

import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authForm } from '../theme/authForm';
import { colors } from '../theme/colors';
import { radii } from '../theme/designSystem';

type Props = {
  visible: boolean;
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
  searchPlaceholder?: string;
};

/** Centered sheet picker — not full-screen (signup role / country). */
export function SignupPickSheet({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  searchable,
  searchPlaceholder = 'Search',
}: Props) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  const close = () => {
    setQuery('');
    onClose();
  };

  const pick = (value: string) => {
    onSelect(value);
    setQuery('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={close} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={close} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </Pressable>
          </View>
          {searchable ? (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.textMuted}
              style={styles.search}
              autoCorrect={false}
            />
          ) : null}
          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            showsVerticalScrollIndicator
            ListEmptyComponent={
              <Text style={styles.empty}>No matches.</Text>
            }
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={styles.row}>
                <Text style={styles.rowText}>{item}</Text>
                {selected === item ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
  },
  sheet: {
    maxHeight: '72%',
    minHeight: 220,
    borderRadius: 20,
    backgroundColor: colors.white,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(11, 18, 32, 0.12)',
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1, paddingRight: 12 },
  search: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
    backgroundColor: 'rgba(248, 250, 252, 0.95)',
  },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowText: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingRight: 10 },
  empty: { textAlign: 'center', color: colors.textMuted, padding: 24, fontWeight: '600' },
});

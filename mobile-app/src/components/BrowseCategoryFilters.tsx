import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FullScreenPickerModal } from './FullScreenPickerModal';
import { colors } from '../theme/colors';
import { radii, surfaces } from '../theme/designSystem';

export type BrowseCategory = { id: number; name: string };

type Props = {
  categories: BrowseCategory[];
  chipCat: BrowseCategory | null;
  filterCat: BrowseCategory | null;
  onChipCatChange: (cat: BrowseCategory | null) => void;
  onFilterCatChange: (cat: BrowseCategory | null) => void;
};

/** Top category chips + filter dropdown; filter selection wins when they differ. */
export function BrowseCategoryFilters({
  categories,
  chipCat,
  filterCat,
  onChipCatChange,
  onFilterCatChange,
}: Props) {
  const [catModal, setCatModal] = useState(false);

  const chipFilterMismatch = useMemo(
    () => chipCat != null && filterCat != null && chipCat.id !== filterCat.id,
    [chipCat, filterCat]
  );

  if (categories.length === 0) return null;

  const selectChip = (cat: BrowseCategory | null) => {
    onChipCatChange(cat);
    onFilterCatChange(cat);
  };

  return (
    <>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
        <Pressable onPress={() => selectChip(null)} style={[styles.catChip, !chipCat && styles.catChipOn]}>
          <Text style={[styles.catChipText, !chipCat && styles.catChipTextOn]}>All</Text>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => selectChip(chipCat?.id === c.id ? null : c)}
            style={[styles.catChip, chipCat?.id === c.id && styles.catChipOn]}
          >
            <Text style={[styles.catChipText, chipCat?.id === c.id && styles.catChipTextOn]}>{c.name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.filterLabel}>Category</Text>
      <Pressable onPress={() => setCatModal(true)} style={styles.selectRow}>
        <Text style={filterCat ? styles.selectVal : styles.selectPh}>
          {filterCat ? filterCat.name : 'All categories'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      {chipFilterMismatch ? (
        <Text style={styles.filterPrecedence}>
          Results use &quot;{filterCat?.name}&quot; from the filter (not the chip above).
        </Text>
      ) : null}

      <FullScreenPickerModal
        visible={catModal}
        onClose={() => setCatModal(false)}
        title="Category"
        headerLeft={
          <Pressable onPress={() => setCatModal(false)}>
            <Text style={styles.modalAction}>Cancel</Text>
          </Pressable>
        }
      >
        <Pressable
          onPress={() => {
            onFilterCatChange(null);
            setCatModal(false);
          }}
          style={[styles.modalRow, styles.modalRowStrong]}
        >
          <Text style={styles.modalRowText}>All categories</Text>
          {!filterCat ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
        </Pressable>
        <FlatList
          data={categories}
          keyExtractor={(c) => String(c.id)}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onFilterCatChange(item);
                setCatModal(false);
              }}
              style={styles.modalRow}
            >
              <Text style={styles.modalRowText}>{item.name}</Text>
              {filterCat?.id === item.id ? (
                <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              ) : null}
            </Pressable>
          )}
        />
      </FullScreenPickerModal>
    </>
  );
}

const styles = StyleSheet.create({
  catRow: { gap: 6, paddingBottom: 2 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipOn: surfaces.goldChip,
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  catChipTextOn: { color: colors.goldDark },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 2 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.white,
  },
  selectVal: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  filterPrecedence: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.primaryDark,
    fontWeight: '600',
    marginTop: -2,
  },
  modalAction: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  modalRowStrong: { backgroundColor: colors.primarySoft },
  modalRowText: { fontSize: 16, color: colors.text, fontWeight: '600', flex: 1, paddingRight: 8 },
});

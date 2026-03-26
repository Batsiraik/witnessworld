import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { colors } from '../theme/colors';

export type LocCountry = { code: string; name: string };
export type LocState = { code: string; name: string };

type Props = {
  country: LocCountry | null;
  usState: LocState | null;
  onCountryChange: (c: LocCountry | null) => void;
  onUsStateChange: (s: LocState | null) => void;
};

export function BrowseLocationFilters({ country, usState, onCountryChange, onUsStateChange }: Props) {
  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await apiGet('locations.php', false);
        if (cancelled) return;
        const cs = loc.countries;
        const ss = loc.us_states;
        const ucc = typeof loc.us_country_code === 'string' ? loc.us_country_code : 'US';
        if (Array.isArray(cs)) {
          setCountries(
            cs.filter((c): c is LocCountry => {
              return c != null && typeof c === 'object' && typeof c.code === 'string' && typeof c.name === 'string';
            })
          );
        }
        if (Array.isArray(ss)) {
          setUsStates(
            ss.filter((s): s is LocState => {
              return s != null && typeof s === 'object' && typeof s.code === 'string' && typeof s.name === 'string';
            })
          );
        }
        setUsCountryCode(ucc);
      } catch {
        if (!cancelled) setLoadErr('Could not load locations.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, countryQuery]);

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    if (!q) return usStates;
    return usStates.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [usStates, stateQuery]);

  const pickCountry = useCallback(
    (c: LocCountry | null) => {
      onCountryChange(c);
      onUsStateChange(null);
      setCountryModal(false);
      setCountryQuery('');
    },
    [onCountryChange, onUsStateChange]
  );

  return (
    <>
      {loadErr ? <Text style={styles.err}>{loadErr}</Text> : null}
      <Text style={styles.filterLabel}>Country (optional)</Text>
      <Pressable onPress={() => setCountryModal(true)} style={styles.selectRow}>
        <Text style={country ? styles.selectVal : styles.selectPh}>
          {country ? `${country.name} (${country.code})` : 'All countries'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      {country?.code === usCountryCode ? (
        <>
          <Text style={styles.filterLabel}>U.S. state (optional)</Text>
          <Pressable onPress={() => setStateModal(true)} style={styles.selectRow}>
            <Text style={usState ? styles.selectVal : styles.selectPh}>
              {usState ? usState.name : 'All states'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </Pressable>
        </>
      ) : null}

      <Modal visible={countryModal} animationType="slide" onRequestClose={() => setCountryModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setCountryModal(false)}>
              <Text style={styles.modalDone}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Country</Text>
            <View style={{ width: 64 }} />
          </View>
          <Pressable
            onPress={() => pickCountry(null)}
            style={[styles.modalRow, styles.modalRowStrong]}
          >
            <Text style={styles.modalRowText}>All countries</Text>
            {!country ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
          </Pressable>
          <TextInput
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder="Search countries"
            style={styles.modalSearch}
            placeholderTextColor={colors.textMuted}
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => pickCountry(item)}
                style={styles.modalRow}
              >
                <Text style={styles.modalRowText}>
                  {item.name} ({item.code})
                </Text>
                {country?.code === item.code ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={stateModal} animationType="slide" onRequestClose={() => setStateModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => {
                onUsStateChange(null);
                setStateModal(false);
                setStateQuery('');
              }}
            >
              <Text style={styles.modalDone}>Clear</Text>
            </Pressable>
            <Text style={styles.modalTitle}>State</Text>
            <Pressable onPress={() => setStateModal(false)}>
              <Text style={styles.modalDone}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            value={stateQuery}
            onChangeText={setStateQuery}
            placeholder="Search states"
            style={styles.modalSearch}
            placeholderTextColor={colors.textMuted}
          />
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  onUsStateChange(item);
                  setStateModal(false);
                  setStateQuery('');
                }}
                style={styles.modalRow}
              >
                <Text style={styles.modalRowText}>{item.name}</Text>
                {usState?.code === item.code ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  err: { fontSize: 13, color: '#b91c1c', fontWeight: '600', marginBottom: 6 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.card,
  },
  selectVal: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 14, color: colors.textMuted },
  modalSafe: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,18,32,0.1)',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalDone: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  modalSearch: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,18,32,0.06)',
  },
  modalRowStrong: { backgroundColor: 'rgba(31, 170, 242, 0.08)' },
  modalRowText: { fontSize: 16, color: colors.text, fontWeight: '600', flex: 1, paddingRight: 8 },
});

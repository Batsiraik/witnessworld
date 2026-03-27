import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Directory'>;

type LocCountry = { code: string; name: string };
type LocState = { code: string; name: string };

type Cat = { slug: string; label: string };

type EntryRow = {
  id: number;
  business_name: string;
  tagline: string | null;
  category: string;
  category_label: string;
  city: string;
  location_us_state: string | null;
  logo_url: string | null;
  phone: string;
  email: string;
  website: string | null;
};

export function DirectoryScreen({ navigation }: Props) {
  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');
  const [locLoading, setLocLoading] = useState(true);

  const [categories, setCategories] = useState<Cat[]>([]);
  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  const [rows, setRows] = useState<EntryRow[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const searchRef = useRef(search);
  searchRef.current = search;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      try {
        const [loc, cats] = await Promise.all([apiGet('locations.php', false), apiGet('directory-categories.php', false)]);
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
        const raw = cats.categories;
        if (Array.isArray(raw)) {
          setCategories(
            raw.filter((x): x is Cat => {
              return x != null && typeof x === 'object' && typeof (x as Cat).slug === 'string' && typeof (x as Cat).label === 'string';
            })
          );
        }
      } catch {
        if (!cancelled) setListError('Could not load filters.');
      } finally {
        if (!cancelled) setLocLoading(false);
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

  const fetchList = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (!country) {
        setListError('Choose a country to browse businesses.');
        setRows([]);
        return;
      }
      if (mode === 'refresh') setListRefreshing(true);
      else setListLoading(true);
      setListError(null);
      try {
        const qs = new URLSearchParams({ country: country.code });
        if (country.code === usCountryCode && usState) {
          qs.set('us_state', usState.name);
        }
        if (categorySlug) {
          qs.set('category', categorySlug);
        }
        const qVal = searchRef.current.trim();
        if (qVal) {
          qs.set('q', qVal);
        }
        const data = await apiGet(`directory-list.php?${qs.toString()}`, false);
        const list = data.entries;
        setRows(Array.isArray(list) ? (list as EntryRow[]) : []);
      } catch (e) {
        setRows([]);
        setListError(e instanceof Error ? e.message : 'Could not load directory.');
      } finally {
        if (mode === 'refresh') setListRefreshing(false);
        else setListLoading(false);
      }
    },
    [country, usCountryCode, usState, categorySlug]
  );

  useEffect(() => {
    if (!country) return;
    void fetchList('full');
  }, [country, usState, categorySlug, fetchList]);

  const categoryLabel = categorySlug ? categories.find((c) => c.slug === categorySlug)?.label ?? 'Category' : 'All categories';

  if (locLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.filters}>
          <Text style={styles.filterLabel}>Country *</Text>
          <Pressable onPress={() => setCountryModal(true)} style={styles.selectRow}>
            <Text style={country ? styles.selectVal : styles.selectPh}>{country ? country.name : 'Select country'}</Text>
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
          <Text style={styles.filterLabel}>Category</Text>
          <Pressable onPress={() => setCatModal(true)} style={styles.selectRow}>
            <Text style={styles.selectVal}>{categoryLabel}</Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.filterLabel}>Search</Text>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Name, city, tagline…"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            onSubmitEditing={() => void fetchList('full')}
          />
          <Pressable onPress={() => void fetchList('full')} style={({ pressed }) => [styles.applyBtn, pressed && styles.pressed]}>
            <Text style={styles.applyBtnText}>Apply filters</Text>
          </Pressable>
        </View>

        {listError ? <Text style={styles.error}>{listError}</Text> : null}

        {listLoading && !listRefreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={rows.length === 0 ? styles.emptyGrow : styles.listPad}
            refreshControl={
              <RefreshControl
                refreshing={listRefreshing}
                onRefresh={() => void fetchList('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              !listError && country ? (
                <Text style={styles.empty}>No businesses match these filters yet.</Text>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => navigation.navigate('DirectoryDetail', { id: item.id })}
                style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              >
                <View style={styles.cardRow}>
                  {item.logo_url ? (
                    <RemoteImage url={item.logo_url} style={styles.logo} contentFit="cover" />
                  ) : (
                    <View style={styles.logoPh}>
                      <Ionicons name="business-outline" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.business_name}
                    </Text>
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.category_label}
                      {item.city ? ` · ${item.city}` : ''}
                      {item.location_us_state ? `, ${item.location_us_state}` : ''}
                    </Text>
                    {item.tagline ? (
                      <Text style={styles.tagline} numberOfLines={2}>
                        {item.tagline}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                </View>
              </Pressable>
            )}
          />
        )}

        <Modal visible={countryModal} animationType="slide" onRequestClose={() => setCountryModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setCountryModal(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Country</Text>
              <View style={{ width: 48 }} />
            </View>
            <TextInput
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search"
              style={styles.modalSearch}
              placeholderTextColor={colors.textMuted}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountry(item);
                    setUsState(null);
                    setCountryModal(false);
                    setCountryQuery('');
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
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
                  setUsState(null);
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
              placeholder="Search"
              style={styles.modalSearch}
              placeholderTextColor={colors.textMuted}
            />
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setUsState(item);
                    setStateModal(false);
                    setStateQuery('');
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={catModal} animationType="slide" onRequestClose={() => setCatModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  setCategorySlug(null);
                  setCatModal(false);
                }}
              >
                <Text style={styles.modalDone}>All</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Category</Text>
              <Pressable onPress={() => setCatModal(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCategorySlug(item.slug);
                    setCatModal(false);
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.label}</Text>
                  {categorySlug === item.slug ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : null}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 6 },
  filterLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, marginTop: 4 },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: colors.card,
  },
  selectVal: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 15, color: colors.textMuted },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: colors.card,
    color: colors.text,
  },
  applyBtn: {
    marginTop: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  error: { paddingHorizontal: 20, color: '#b91c1c', fontSize: 13, fontWeight: '600' },
  listPad: { paddingHorizontal: 20, paddingBottom: 24, gap: 10 },
  emptyGrow: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 24 },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 15 },
  card: {
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 8,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logo: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.primarySoft },
  logoPh: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  tagline: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  pressed: { opacity: 0.92 },
  modalSafe: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalDone: { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalSearch: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalRowText: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
});

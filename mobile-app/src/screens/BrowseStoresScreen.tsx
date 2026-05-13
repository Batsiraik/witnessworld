import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
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
import { BrowseLocationFilters, type LocCountry, type LocState } from '../components/BrowseLocationFilters';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, surfaces, typography } from '../theme/designSystem';
import { GRID_GAP, GRID_IMAGE_ASPECT, GRID_PAD, useGridTileWidth } from '../utils/browseGrid';

type Props = NativeStackScreenProps<HomeStackParamList, 'Stores'>;

type StoreCategory = { id: number; name: string; slug: string };

type Row = {
  id: number;
  name: string;
  sells_summary: string;
  logo_url: string;
  category_name?: string | null;
  location_country_name: string;
  location_us_state: string | null;
};

export function BrowseStoresScreen({ navigation }: Props) {
  const tileW = useGridTileWidth();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<StoreCategory | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<LocCountry | null>(null);
  const [selectedUsState, setSelectedUsState] = useState<LocState | null>(null);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('store-categories.php', false);
        const cats = data.categories;
        if (!cancelled && Array.isArray(cats)) setCategories(cats as StoreCategory[]);
      } catch { /* optional */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedCat) p.set('category_id', String(selectedCat.id));
    if (selectedCountry?.code) p.set('country', selectedCountry.code.toUpperCase());
    if (selectedUsState?.name) p.set('us_state', selectedUsState.name);
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    p.set('limit', '50');
    return p.toString();
  }, [selectedCat, selectedCountry, selectedUsState, appliedQ]);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErr(null);
      try {
        const data = await apiGet(`marketplace-stores.php?${qs}`, false);
        const L = data.stores;
        setRows(Array.isArray(L) ? (L as Row[]) : []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error');
        setRows([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [qs]
  );

  useEffect(() => {
    void load('full');
  }, [load]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.filters}>
          {categories.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
              <Pressable
                onPress={() => setSelectedCat(null)}
                style={[styles.catChip, !selectedCat && styles.catChipOn]}
              >
                <Text style={[styles.catChipText, !selectedCat && styles.catChipTextOn]}>All</Text>
              </Pressable>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => setSelectedCat(selectedCat?.id === c.id ? null : c)}
                  style={[styles.catChip, selectedCat?.id === c.id && styles.catChipOn]}
                >
                  <Text style={[styles.catChipText, selectedCat?.id === c.id && styles.catChipTextOn]}>{c.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          <BrowseLocationFilters
            country={selectedCountry}
            usState={selectedUsState}
            onCountryChange={setSelectedCountry}
            onUsStateChange={setSelectedUsState}
          />
          <TextInput
            style={styles.input}
            placeholder="Search store name"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
          <Pressable onPress={() => setAppliedQ(q)} style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply filters</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : err ? (
          <ScrollView
            contentContainerStyle={styles.errScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <Text style={styles.err}>{err}</Text>
          </ScrollView>
        ) : (
          <FlatList
            style={styles.listFlex}
            data={rows}
            keyExtractor={(it) => String(it.id)}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listPad}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              rows.length > 0 ? (
                <Text style={styles.resultCount}>
                  {rows.length} {rows.length === 1 ? 'result' : 'results'}
                </Text>
              ) : null
            }
            ListEmptyComponent={<Text style={styles.empty}>No stores match.</Text>}
            renderItem={({ item }) => {
              const loc = [item.location_us_state, item.location_country_name].filter(Boolean).join(', ');
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.gridTile,
                    { width: tileW },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => navigation.push('StoreDetailPublic', { id: item.id })}
                >
                  <View style={styles.gridImgWrap}>
                    {item.logo_url ? (
                      <RemoteImage url={item.logo_url} style={styles.gridImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.gridImg, styles.thumbPh]}>
                        <Ionicons name="storefront-outline" size={36} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.gridBody}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridSub} numberOfLines={2}>
                      {item.sells_summary || 'Store'}
                    </Text>
                    <View style={styles.gridLocRow}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.gridLoc} numberOfLines={1}>
                        {loc || '—'}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filters: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
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
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.white,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    marginBottom: 8,
  },
  applyText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  center: { padding: 40, alignItems: 'center' },
  listFlex: { flex: 1 },
  listPad: { paddingHorizontal: GRID_PAD, paddingBottom: 28 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  resultCount: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12 },
  errScroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8 },
  err: { color: '#b91c1c', padding: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24, fontWeight: '600' },
  gridTile: surfaces.shopCard,
  cardPressed: { opacity: 0.92 },
  gridImgWrap: { overflow: 'hidden', borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg },
  gridImg: {
    width: '100%',
    aspectRatio: GRID_IMAGE_ASPECT,
    backgroundColor: colors.primarySoft,
  },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  gridBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  gridTitle: { ...typography.cardTitle, minHeight: 36 },
  gridSub: { ...typography.caption, marginTop: 4, lineHeight: 16 },
  gridLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  gridLoc: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textMuted },
});

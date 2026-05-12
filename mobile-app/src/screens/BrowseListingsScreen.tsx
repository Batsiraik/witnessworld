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
import { GRID_GAP, GRID_IMAGE_ASPECT, GRID_PAD, useGridTileWidth } from '../utils/browseGrid';

type Props = NativeStackScreenProps<HomeStackParamList, 'Services' | 'Classifieds'>;

type MktCategory = { id: number; name: string; slug: string };

type Row = {
  id: number;
  title: string;
  price_amount: string | null;
  is_free?: boolean;
  pricing_type: string;
  currency: string;
  media_url: string | null;
  category_name?: string | null;
  location_country_name: string | null;
  location_us_state: string | null;
  seller_label?: string;
  seller_username?: string;
  seller_avatar_url?: string | null;
};

export function BrowseListingsScreen({ navigation, route }: Props) {
  const tileW = useGridTileWidth();
  const listingType = route.name === 'Services' ? 'service' : 'classified';
  const isClassified = listingType === 'classified';
  const [categories, setCategories] = useState<MktCategory[]>([]);
  const [selectedCat, setSelectedCat] = useState<MktCategory | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<LocCountry | null>(null);
  const [selectedUsState, setSelectedUsState] = useState<LocState | null>(null);
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const initialQuery =
    route.params && typeof route.params === 'object' && 'initialQuery' in route.params
      ? String(route.params.initialQuery ?? '').trim()
      : '';

  useEffect(() => {
    if (initialQuery) {
      setQ(initialQuery);
      setAppliedQ(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (!isClassified) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('marketplace-categories.php', false);
        const cats = data.categories;
        if (!cancelled && Array.isArray(cats)) setCategories(cats as MktCategory[]);
      } catch { /* optional */ }
    })();
    return () => { cancelled = true; };
  }, [isClassified]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set('listing_type', listingType);
    if (selectedCat) p.set('category_id', String(selectedCat.id));
    if (selectedCountry?.code) p.set('country', selectedCountry.code.toUpperCase());
    if (selectedUsState?.name) p.set('us_state', selectedUsState.name);
    if (priceMin.trim()) p.set('price_min', priceMin.trim());
    if (priceMax.trim()) p.set('price_max', priceMax.trim());
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    p.set('limit', '50');
    return p.toString();
  }, [listingType, selectedCat, selectedCountry, selectedUsState, priceMin, priceMax, appliedQ]);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErr(null);
      try {
        const data = await apiGet(`marketplace-listings.php?${queryString}`, false);
        const L = data.listings;
        setRows(Array.isArray(L) ? (L as Row[]) : []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error');
        setRows([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [queryString]
  );

  useEffect(() => {
    void load('full');
  }, [load]);

  const applyFilters = () => {
    setAppliedQ(q);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.filters}>
          {isClassified && categories.length > 0 ? (
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
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Min price"
              placeholderTextColor={colors.textMuted}
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Max price"
              placeholderTextColor={colors.textMuted}
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Search title & description"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
          <Pressable onPress={applyFilters} style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply filters</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
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
            ListEmptyComponent={<Text style={styles.empty}>No listings match.</Text>}
            renderItem={({ item }) => {
              const loc = [item.location_us_state, item.location_country_name].filter(Boolean).join(', ');
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.gridTile,
                    { width: tileW },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => navigation.push('ListingDetail', { id: item.id })}
                >
                  <View style={styles.gridImgWrap}>
                    {item.media_url ? (
                      <RemoteImage url={item.media_url} style={styles.gridImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.gridImg, styles.thumbPh]}>
                        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.gridBody}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {item.is_free ? (
                      <Text style={styles.gridPriceFree}>FREE</Text>
                    ) : item.price_amount ? (
                      <Text style={styles.gridPrice}>
                        {item.currency} {item.price_amount}
                        {item.pricing_type === 'hourly' ? '/hr' : ''}
                      </Text>
                    ) : (
                      <Text style={styles.gridPriceMuted}>See listing</Text>
                    )}
                    <View style={styles.gridLocRow}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.gridLoc} numberOfLines={1}>
                        {loc || 'Location not set'}
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
  filters: { paddingHorizontal: 16, paddingTop: 8, gap: 8, paddingBottom: 4 },
  catRow: { gap: 6, paddingBottom: 2 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(11,18,32,0.06)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catChipOn: {
    backgroundColor: 'rgba(31,170,242,0.15)',
    borderColor: 'rgba(31,170,242,0.4)',
  },
  catChipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  catChipTextOn: { color: colors.primaryDark },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.card,
  },
  row2: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
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
  gridTile: {
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.92 },
  gridImgWrap: { overflow: 'hidden', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  gridImg: {
    width: '100%',
    aspectRatio: GRID_IMAGE_ASPECT,
    backgroundColor: colors.primarySoft,
  },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  gridBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  gridTitle: { fontSize: 14, fontWeight: '800', color: colors.text, lineHeight: 18, minHeight: 36 },
  gridPrice: { fontSize: 15, fontWeight: '800', color: '#2563EB', marginTop: 6 },
  gridPriceFree: { fontSize: 14, fontWeight: '800', color: '#059669', marginTop: 6 },
  gridPriceMuted: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  gridLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gridLoc: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textMuted },
});

/** Separate route components so native-stack keeps distinct screen instances (shared component breaks back stack). */
export function BrowseClassifiedsScreen(props: NativeStackScreenProps<HomeStackParamList, 'Classifieds'>) {
  return <BrowseListingsScreen {...props} />;
}

export function BrowseServicesScreen(props: NativeStackScreenProps<HomeStackParamList, 'Services'>) {
  return <BrowseListingsScreen {...props} />;
}

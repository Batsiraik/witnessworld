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

type Props = NativeStackScreenProps<HomeStackParamList, 'ProductsBrowse'>;

type Row = {
  id: number;
  name: string;
  price_amount: string;
  currency: string;
  image_url: string | null;
  store_name: string;
  location_country_name: string;
  location_us_state: string | null;
  moderation_status?: string;
};

export function BrowseProductsScreen({ navigation }: Props) {
  const tileW = useGridTileWidth();
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

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedCountry?.code) p.set('country', selectedCountry.code.toUpperCase());
    if (selectedUsState?.name) p.set('us_state', selectedUsState.name);
    if (priceMin.trim()) p.set('price_min', priceMin.trim());
    if (priceMax.trim()) p.set('price_max', priceMax.trim());
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    p.set('limit', '50');
    return p.toString();
  }, [selectedCountry, selectedUsState, priceMin, priceMax, appliedQ]);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErr(null);
      try {
        const data = await apiGet(`marketplace-products.php?${qs}`, false);
        const L = data.products;
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
          <BrowseLocationFilters
            country={selectedCountry}
            usState={selectedUsState}
            onCountryChange={setSelectedCountry}
            onUsStateChange={setSelectedUsState}
          />
          <View style={styles.row2}>
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Min $"
              placeholderTextColor={colors.textMuted}
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="decimal-pad"
            />
            <TextInput
              style={[styles.input, styles.half]}
              placeholder="Max $"
              placeholderTextColor={colors.textMuted}
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="decimal-pad"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Search products"
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
            ListEmptyComponent={<Text style={styles.empty}>No products match.</Text>}
            renderItem={({ item }) => {
              const loc = [item.location_us_state, item.location_country_name].filter(Boolean).join(', ');
              return (
                <Pressable
                  style={({ pressed }) => [
                    styles.gridTile,
                    { width: tileW },
                    pressed && styles.cardPressed,
                  ]}
                  onPress={() => navigation.push('ProductDetail', { id: item.id })}
                >
                  <View style={styles.gridImgWrap}>
                    {item.image_url ? (
                      <RemoteImage url={item.image_url} style={styles.gridImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.gridImg, styles.thumbPh]}>
                        <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                      </View>
                    )}
                  </View>
                  <View style={styles.gridBody}>
                    <Text style={styles.gridTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.gridStore} numberOfLines={1}>
                      {item.store_name}
                    </Text>
                    {item.moderation_status === 'pending_approval' ? (
                      <Text style={styles.pendingHint} numberOfLines={2}>
                        Pending approval
                      </Text>
                    ) : null}
                    <Text style={styles.gridPrice}>
                      {item.currency} {item.price_amount}
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
  row2: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
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
  gridStore: { ...typography.meta, marginTop: 4 },
  pendingHint: { fontSize: 10, fontWeight: '700', color: colors.goldDark, marginTop: 4, lineHeight: 13 },
  gridPrice: { ...typography.price, marginTop: 6 },
  gridLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  gridLoc: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textMuted },
});

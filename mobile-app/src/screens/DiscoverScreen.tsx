import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { FullScreenPickerModal } from '../components/FullScreenPickerModal';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import type { DiscoverStackParamList, HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { radii, surfaces, typography } from '../theme/designSystem';
import { GRID_GAP, GRID_PAD, useGridTileWidth } from '../utils/browseGrid';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Discover'>;

type PillId = 'all' | 'marketplace' | 'services' | 'community' | 'stores' | 'businesses';

type FeedListing = {
  id: number;
  title: string;
  price_amount: string | null;
  is_featured?: boolean;
  is_urgent?: boolean;
  is_verified?: boolean;
  pricing_type: string;
  currency: string;
  media_url: string | null;
  location_country_name: string | null;
  location_us_state: string | null;
  created_at: string;
};

type FeedProduct = {
  id: number;
  name: string;
  price_amount: string;
  currency: string;
  image_url: string | null;
  store_name: string;
  location_country_name: string;
  location_us_state: string | null;
  created_at: string;
};

type FeedStore = {
  id: number;
  name: string;
  sells_summary: string;
  logo_url: string;
  location_country_name: string;
  location_us_state: string | null;
  created_at: string;
};

type FeedDirectory = {
  id: number;
  business_name: string;
  tagline: string | null;
  category_label: string;
  city: string;
  location_us_state: string | null;
  location_country_name: string;
  logo_url: string | null;
  created_at: string;
};

type DiscoverItem =
  | { kind: 'classified' | 'service' | 'community'; listing: FeedListing; created_at: string }
  | { kind: 'product'; product: FeedProduct; created_at: string }
  | { kind: 'store'; store: FeedStore; created_at: string }
  | { kind: 'directory'; entry: FeedDirectory; created_at: string };

const PILLS: { id: PillId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'marketplace', label: 'Marketplace' },
  { id: 'services', label: 'Services' },
  { id: 'community', label: 'Community' },
  { id: 'stores', label: 'Stores' },
  { id: 'businesses', label: 'Businesses' },
];

const PAGE_SIZE = 50;

function parseDiscoverItems(raw: unknown): DiscoverItem[] {
  if (!Array.isArray(raw)) return [];
  const out: DiscoverItem[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const kind = String(o.kind ?? '');
    const created_at = String(o.created_at ?? '');
    if (
      (kind === 'service' || kind === 'classified' || kind === 'community') &&
      o.listing != null &&
      typeof o.listing === 'object'
    ) {
      out.push({ kind, listing: o.listing as FeedListing, created_at });
      continue;
    }
    if (kind === 'product' && o.product != null && typeof o.product === 'object') {
      out.push({ kind: 'product', product: o.product as FeedProduct, created_at });
      continue;
    }
    if (kind === 'store' && o.store != null && typeof o.store === 'object') {
      out.push({ kind: 'store', store: o.store as FeedStore, created_at });
      continue;
    }
    if (kind === 'directory' && o.entry != null && typeof o.entry === 'object') {
      out.push({ kind: 'directory', entry: o.entry as FeedDirectory, created_at });
    }
  }
  return out;
}

function discoverSection(pill: PillId): string {
  if (pill === 'businesses') return 'directory';
  return pill;
}

export function DiscoverScreen({ navigation }: Props) {
  const tileWGrid = useGridTileWidth();
  const [pill, setPill] = useState<PillId>('all');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);

  const locParams = useMemo(() => {
    const p = new URLSearchParams();
    if (country?.code) p.set('country', country.code.toUpperCase());
    if (usState?.name) p.set('us_state', usState.name);
    return p;
  }, [country, usState]);

  const itemsLenRef = useRef(0);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const searchRef = useRef(search);

  useEffect(() => {
    itemsLenRef.current = items.length;
  }, [items.length]);
  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    searchRef.current = search;
  }, [search]);

  const itemKey = (it: DiscoverItem) => {
    if (it.kind === 'classified' || it.kind === 'service' || it.kind === 'community') {
      return `l-${it.kind}-${it.listing.id}`;
    }
    if (it.kind === 'product') return `p-${it.product.id}`;
    if (it.kind === 'store') return `s-${it.store.id}`;
    return `d-${it.entry.id}`;
  };

  const load = useCallback(
    async (mode: 'full' | 'refresh' | 'more' = 'full') => {
      if (mode === 'more') {
        if (loadingMoreRef.current || !hasMoreRef.current || searchRef.current.trim()) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else if (mode === 'refresh') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErr(null);
      try {
        const offset = mode === 'more' ? itemsLenRef.current : 0;
        const qs = new URLSearchParams(locParams);
        qs.set('section', discoverSection(pill));
        qs.set('limit', String(PAGE_SIZE));
        qs.set('offset', String(offset));
        const data = await apiGet(`discover-feed.php?${qs.toString()}`, true);
        const page = parseDiscoverItems(data.items);
        const more = data.has_more === true;
        if (mode === 'more') {
          setItems((prev) => {
            const seen = new Set(prev.map(itemKey));
            const next = [...prev];
            for (const it of page) {
              const key = itemKey(it);
              if (!seen.has(key)) {
                seen.add(key);
                next.push(it);
              }
            }
            return next;
          });
        } else {
          setItems(page);
        }
        setHasMore(more);
        hasMoreRef.current = more;
      } catch (e) {
        if (mode !== 'more') {
          setErr(e instanceof Error ? e.message : 'Could not load');
          setItems([]);
          setHasMore(false);
          hasMoreRef.current = false;
        }
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else if (mode === 'more') {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else setLoading(false);
      }
    },
    [pill, locParams]
  );

  useEffect(() => {
    setHasMore(false);
    hasMoreRef.current = false;
    void load('full');
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      if (it.kind === 'classified' || it.kind === 'service' || it.kind === 'community') {
        const t = it.listing.title.toLowerCase();
        return t.includes(q);
      }
      if (it.kind === 'product') {
        const t = `${it.product.name} ${it.product.store_name}`.toLowerCase();
        return t.includes(q);
      }
      if (it.kind === 'store') {
        return `${it.store.name} ${it.store.sells_summary}`.toLowerCase().includes(q);
      }
      if (it.kind === 'directory') {
        const e = it.entry;
        return `${e.business_name} ${e.tagline ?? ''} ${e.city}`.toLowerCase().includes(q);
      }
      return false;
    });
  }, [items, search]);

  const tileW = tileWGrid;

  const goHome = useCallback(
    <S extends keyof HomeStackParamList>(screen: S, params?: HomeStackParamList[S]) => {
      const tab = navigation.getParent();
      if (!tab) return;
      /** `initial: false` keeps the Home stack from resetting when opening detail from Discover. */
      tab.navigate('HomeTab', { screen, params, initial: false } as never);
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: DiscoverItem }) => {
      const locLine = (a: string | null | undefined, b: string | null | undefined) =>
        [b, a].filter(Boolean).join(', ');

      if (item.kind === 'classified' || item.kind === 'service' || item.kind === 'community') {
        const row = item.listing;
        const loc = locLine(row.location_country_name, row.location_us_state);
        return (
          <Pressable
            style={({ pressed }) => [
              styles.tile,
              row.is_featured && styles.tileFeatured,
              row.is_urgent && styles.tileUrgent,
              { width: tileW },
              pressed && styles.pressed,
            ]}
            onPress={() => goHome('ListingDetail', { id: row.id })}
          >
            <View style={styles.imgWrap}>
              {row.media_url ? (
                <RemoteImage url={row.media_url} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, styles.imgPh]}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.tileBody}>
              {row.is_featured || row.is_urgent || row.is_verified ? (
                <View style={styles.badgeRow}>
                  {row.is_featured ? <Text style={[styles.badge, styles.badgeFeatured]}>Featured</Text> : null}
                  {row.is_urgent ? <Text style={[styles.badge, styles.badgeUrgent]}>Urgent</Text> : null}
                  {row.is_verified ? <Text style={[styles.badge, styles.badgeVerified]}>Verified</Text> : null}
                </View>
              ) : null}
              <Text style={styles.tileTitle} numberOfLines={2}>
                {row.title}
              </Text>
              {row.price_amount ? (
                <Text style={styles.tilePrice}>
                  {row.currency} {row.price_amount}
                  {row.pricing_type === 'hourly' ? '/hr' : ''}
                </Text>
              ) : (
                <Text style={styles.tilePriceMuted}>View</Text>
              )}
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.loc} numberOfLines={1}>
                  {loc || '—'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }

      if (item.kind === 'product') {
        const row = item.product;
        const loc = locLine(row.location_country_name, row.location_us_state);
        return (
          <Pressable
            style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
            onPress={() => goHome('ProductDetail', { id: row.id })}
          >
            <View style={styles.imgWrap}>
              {row.image_url ? (
                <RemoteImage url={row.image_url} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, styles.imgPh]}>
                  <Ionicons name="image-outline" size={32} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.tileBody}>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {row.name}
              </Text>
              <Text style={styles.tileMeta} numberOfLines={1}>
                {row.store_name}
              </Text>
              <Text style={styles.tilePrice}>
                {row.currency} {row.price_amount}
              </Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.loc} numberOfLines={1}>
                  {loc || '—'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }

      if (item.kind === 'store') {
        const row = item.store;
        const loc = locLine(row.location_country_name, row.location_us_state);
        return (
          <Pressable
            style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
            onPress={() => goHome('StoreDetailPublic', { id: row.id })}
          >
            <View style={styles.imgWrap}>
              {row.logo_url ? (
                <RemoteImage url={row.logo_url} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, styles.imgPh]}>
                  <Ionicons name="storefront-outline" size={32} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.tileBody}>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {row.name}
              </Text>
              <Text style={styles.tileMeta} numberOfLines={2}>
                {row.sells_summary || 'Store'}
              </Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.loc} numberOfLines={1}>
                  {loc || '—'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }

      if (item.kind === 'directory') {
        const row = item.entry;
        const loc = [row.city, row.location_us_state].filter(Boolean).join(', ');
        return (
          <Pressable
            style={({ pressed }) => [styles.tile, { width: tileW }, pressed && styles.pressed]}
            onPress={() => goHome('DirectoryDetail', { id: row.id })}
          >
            <View style={styles.imgWrap}>
              {row.logo_url ? (
                <RemoteImage url={row.logo_url} style={styles.img} contentFit="cover" />
              ) : (
                <View style={[styles.img, styles.imgPh]}>
                  <Ionicons name="business-outline" size={32} color={colors.textMuted} />
                </View>
              )}
            </View>
            <View style={styles.tileBody}>
              <Text style={styles.tileTitle} numberOfLines={2}>
                {row.business_name}
              </Text>
              <Text style={styles.tileMeta} numberOfLines={1}>
                {row.category_label}
              </Text>
              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                <Text style={styles.loc} numberOfLines={1}>
                  {loc || row.location_country_name || '—'}
                </Text>
              </View>
            </View>
          </Pressable>
        );
      }

      return null;
    },
    [goHome, tileW]
  );

  const keyExtractor = useCallback((it: DiscoverItem) => {
    if (it.kind === 'classified' || it.kind === 'service' || it.kind === 'community') return `l-${it.kind}-${it.listing.id}`;
    if (it.kind === 'product') return `p-${it.product.id}`;
    if (it.kind === 'store') return `s-${it.store.id}`;
    if (it.kind === 'directory') return `d-${it.entry.id}`;
    return 'x';
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} style={styles.searchIcon} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            onPress={() => setFilterOpen(true)}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityLabel="Location filters"
          >
            <Ionicons name="options-outline" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.viewToggle}>
            <View style={[styles.toggleBtn, styles.toggleBtnOn]}>
              <Ionicons name="grid-outline" size={20} color={colors.white} />
            </View>
            <View style={[styles.toggleBtn, styles.toggleBtnDisabled]} pointerEvents="none">
              <Ionicons name="list-outline" size={20} color={colors.textMuted} />
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillRowHost}
          contentContainerStyle={styles.pillScroll}
        >
          {PILLS.map((p) => {
            const on = pill === p.id;
            return (
              <Pressable
                key={p.id}
                onPress={() => setPill(p.id)}
                style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && styles.pressed]}
              >
                <Text style={[styles.pillText, on && styles.pillTextOn]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : err ? (
          <View style={styles.center}>
            <Text style={styles.err}>{err}</Text>
            <Pressable onPress={() => void load('full')} style={styles.retry}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            style={styles.listFlex}
            data={filtered}
            keyExtractor={keyExtractor}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            contentContainerStyle={styles.listPad}
            onEndReached={() => {
              if (!search.trim()) void load('more');
            }}
            onEndReachedThreshold={0.35}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              filtered.length > 0 ? (
                <Text style={styles.resultCount}>
                  {filtered.length}
                  {hasMore && !search.trim() ? '+' : ''}{' '}
                  {filtered.length === 1 ? 'result' : 'results'}
                </Text>
              ) : null
            }
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.moreWrap}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={<Text style={styles.empty}>Nothing matches yet.</Text>}
            renderItem={renderItem}
          />
        )}

        <FullScreenPickerModal visible={filterOpen} onClose={() => setFilterOpen(false)} title="Filters">
          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <BrowseLocationFilters
              country={country}
              usState={usState}
              onCountryChange={setCountry}
              onUsStateChange={setUsState}
            />
            <Pressable
              onPress={() => {
                setFilterOpen(false);
                void load('full');
              }}
              style={styles.applyLoc}
            >
              <Text style={styles.applyLocText}>Apply</Text>
            </Pressable>
          </ScrollView>
        </FullScreenPickerModal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GRID_PAD,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchIcon: { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: colors.text },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  viewToggle: { flexDirection: 'row', backgroundColor: 'rgba(11, 18, 32, 0.06)', borderRadius: 12, padding: 3 },
  toggleBtn: {
    width: 38,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleBtnOn: { backgroundColor: '#2563EB' },
  toggleBtnDisabled: { opacity: 0.45 },
  /** Stops horizontal ScrollView from growing to fill column (avoids huge gap above pills). */
  pillRowHost: { flexGrow: 0 },
  pillScroll: { paddingHorizontal: GRID_PAD, paddingBottom: 12, gap: 8, flexDirection: 'row', alignItems: 'center' },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.12)',
    marginRight: 8,
  },
  pillOn: surfaces.goldChip,
  pillText: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
  pillTextOn: { color: colors.goldDark },
  listFlex: { flex: 1 },
  listPad: { paddingHorizontal: GRID_PAD, paddingBottom: 28 },
  gridRow: { gap: GRID_GAP, marginBottom: GRID_GAP },
  resultCount: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 12 },
  moreWrap: { paddingVertical: 18, alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: '#b91c1c', fontWeight: '600', textAlign: 'center' },
  retry: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 20 },
  retryText: { fontWeight: '800', color: colors.primaryDark },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24, fontWeight: '600' },
  tile: surfaces.shopCard,
  tileFeatured: { borderWidth: 1, borderColor: 'rgba(200, 162, 74, 0.48)' },
  tileUrgent: { borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.34)' },
  imgWrap: { overflow: 'hidden' },
  img: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.primarySoft },
  imgPh: { alignItems: 'center', justifyContent: 'center' },
  tileBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12, flex: 1 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 6 },
  badge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 9,
    fontWeight: '800',
  },
  badgeFeatured: { backgroundColor: colors.goldSoft, color: colors.goldDark },
  badgeUrgent: { backgroundColor: 'rgba(220, 38, 38, 0.1)', color: colors.danger },
  badgeVerified: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  tileTitle: { ...typography.cardTitle, minHeight: 36 },
  tileMeta: { ...typography.meta, marginTop: 4 },
  tilePrice: { ...typography.price, marginTop: 6 },
  tilePriceMuted: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginTop: 6 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  loc: { flex: 1, fontSize: 11, fontWeight: '600', color: colors.textMuted },
  pressed: { opacity: 0.9 },
  modalBody: { padding: 16, paddingBottom: 32 },
  applyLoc: {
    marginTop: 16,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyLocText: { color: colors.white, fontWeight: '800', fontSize: 15 },
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
import { NotificationsModal } from '../components/NotificationsModal';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { LocCountry, LocState } from '../components/BrowseLocationFilters';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const SCREEN_W = Dimensions.get('window').width;
const HOME_LOGO = require('../../assets/logo.jpg');
const FEATURED_CARD_W = Math.min(SCREEN_W * 0.4, 156);
const TREND_CARD_W = Math.min(SCREEN_W * 0.42, 168);
const ACTION_GAP = 10;
const STAR_GOLD = '#F5C518';

type Feed = {
  services: Record<string, unknown>[];
  products: Record<string, unknown>[];
  classifieds: Record<string, unknown>[];
  community: Record<string, unknown>[];
  stores: Record<string, unknown>[];
  directory: Record<string, unknown>[];
  featured: FeaturedRow[];
};

type FeaturedRow = {
  kind: string;
  listing?: Record<string, unknown>;
  product?: Record<string, unknown>;
};

function normalizeFeatured(raw: unknown): FeaturedRow[] {
  if (!Array.isArray(raw)) return [];
  const out: FeaturedRow[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const kind = String(o.kind ?? '');
    if (kind === 'product' && o.product != null && typeof o.product === 'object') {
      out.push({ kind: 'product', product: o.product as Record<string, unknown> });
      continue;
    }
    if (
      (kind === 'service' || kind === 'classified' || kind === 'community') &&
      o.listing != null &&
      typeof o.listing === 'object'
    ) {
      out.push({ kind, listing: o.listing as Record<string, unknown> });
    }
  }
  return out;
}

function normalizeFeed(raw: unknown): Feed {
  if (raw == null || typeof raw !== 'object') {
    return {
      services: [],
      products: [],
      classifieds: [],
      community: [],
      stores: [],
      directory: [],
      featured: [],
    };
  }
  const f = raw as Record<string, unknown>;
  const arr = (k: string) => (Array.isArray(f[k]) ? (f[k] as Record<string, unknown>[]) : []);
  return {
    services: arr('services'),
    products: arr('products'),
    classifieds: arr('classifieds'),
    community: arr('community'),
    stores: arr('stores'),
    directory: arr('directory'),
    featured: normalizeFeatured(f.featured),
  };
}

function formatListingLocation(row: Record<string, unknown>): string {
  const st = row.location_us_state ? String(row.location_us_state) : '';
  const c = row.location_country_name ? String(row.location_country_name) : '';
  const parts = [st, c].filter(Boolean);
  return parts.join(', ') || 'Location not set';
}

function formatDirLocation(row: Record<string, unknown>): string {
  const city = row.city ? String(row.city) : '';
  const st = row.location_us_state ? String(row.location_us_state) : '';
  const parts = [city, st].filter(Boolean);
  return parts.join(', ') || formatListingLocation(row);
}

function sellerLabel(row: Record<string, unknown>): string {
  const label = String(row.seller_label ?? '').trim();
  if (label) return label;
  const u = String(row.seller_username ?? '').trim();
  return u || 'Member';
}

function formatPrice(row: Record<string, unknown>): string | null {
  const price = row.price_amount != null && row.price_amount !== '' ? String(row.price_amount) : null;
  if (!price) return null;
  const cur = String(row.currency ?? 'USD');
  const pt = String(row.pricing_type ?? 'fixed');
  const symbol = cur === 'USD' ? '$' : `${cur} `;
  return `${symbol}${price}${pt === 'hourly' ? ' /HR' : ''}`;
}

function priceParts(row: Record<string, unknown>): { amount: string; suffix: string } | null {
  const price = row.price_amount != null && row.price_amount !== '' ? String(row.price_amount) : null;
  if (!price) return null;
  const cur = String(row.currency ?? 'USD');
  const pt = String(row.pricing_type ?? 'fixed');
  const amount = cur === 'USD' ? `$${price}` : `${cur} ${price}`;
  const suffix = pt === 'hourly' ? '/hr' : 'flat';
  return { amount, suffix };
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons
          key={n}
          name={n <= filled ? 'star' : 'star-outline'}
          size={9}
          color={n <= filled ? STAR_GOLD : '#C5CAD3'}
        />
      ))}
    </View>
  );
}

export function HomeScreen({ navigation }: Props) {
  const { isGuest, showGuestPrompt } = useDashboardContext();
  const searchRef = useRef<TextInput>(null);
  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);
  const [locModal, setLocModal] = useState(false);
  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [countryQuery, setCountryQuery] = useState('');

  const [searchQ, setSearchQ] = useState('');

  const [feed, setFeed] = useState<Feed | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedErr, setFeedErr] = useState<string | null>(null);
  const [notifModal, setNotifModal] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const loc = await apiGet('locations.php', false);
        const cs = loc.countries;
        const ss = loc.us_states;
        if (cancelled) return;
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
      } catch {
        /* locations optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isGuest) {
      setNotifUnread(0);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('user-notifications.php');
        if (cancelled || !data.ok) return;
        setNotifUnread(typeof data.unread_count === 'number' ? data.unread_count : 0);
      } catch {
        /* optional badge */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isGuest]);

  const locationLabel = useMemo(() => {
    if (!country) return 'All locations';
    if (country.code === 'US' && usState) return `${usState.name}, ${country.name}`;
    return country.name;
  }, [country, usState]);

  const loadFeed = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setFeedRefreshing(true);
      else setFeedLoading(true);
      setFeedErr(null);
      try {
        const qs = new URLSearchParams();
        qs.set('section', 'all');
        qs.set('limit', '12');
        if (country?.code) qs.set('country', country.code);
        if (usState?.name) qs.set('us_state', usState.name);
        const data = await apiGet(`marketplace-home-feed.php?${qs.toString()}`, true);
        setFeed(normalizeFeed(data.feed));
      } catch (e) {
        setFeedErr(e instanceof Error ? e.message : 'Could not load feed');
        setFeed(null);
      } finally {
        if (mode === 'refresh') setFeedRefreshing(false);
        else setFeedLoading(false);
      }
    },
    [country, usState]
  );

  useEffect(() => {
    void loadFeed('full');
  }, [loadFeed]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, countryQuery]);

  const featuredServices = useMemo(() => {
    if (!feed) return [] as Record<string, unknown>[];
    const fromFeatured = feed.featured
      .filter((f) => f.kind === 'service' && f.listing)
      .map((f) => f.listing as Record<string, unknown>);
    if (fromFeatured.length) return fromFeatured;
    return feed.services;
  }, [feed]);

  const trendingRows = useMemo(() => {
    if (!feed) return [] as { kind: 'product' | 'listing'; row: Record<string, unknown> }[];
    const out: { kind: 'product' | 'listing'; row: Record<string, unknown> }[] = [];
    for (const p of feed.products.slice(0, 6)) out.push({ kind: 'product', row: p });
    for (const c of feed.classifieds.slice(0, 6)) out.push({ kind: 'listing', row: c });
    return out.slice(0, 10);
  }, [feed]);

  const submitSearch = () => {
    const q = searchQ.trim();
    if (!q) {
      searchRef.current?.focus();
      return;
    }
    navigation.navigate('Services', { initialQuery: q });
  };

  const goPromote = () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    navigation.navigate('ProviderHub');
  };

  const rail = (title: string, seeAll: (() => void) | null, children: ReactNode) => (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <Text style={styles.railTitle}>{title}</Text>
        {seeAll ? (
          <Pressable onPress={seeAll} hitSlop={8}>
            <Text style={styles.seeAll}>See All {'>'}</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );

  const serviceCard = (row: Record<string, unknown>) => {
    const id = Number(row.id);
    const title = String(row.title ?? '');
    const media = row.media_url ? String(row.media_url) : null;
    const avatar = row.seller_avatar_url ? String(row.seller_avatar_url) : null;
    const seller = sellerLabel(row);
    const parts = priceParts(row);
    const ratingAvg = typeof row.rating_average === 'number' ? row.rating_average : Number(row.rating_average);
    const ratingCount = typeof row.rating_count === 'number' ? row.rating_count : Number(row.rating_count ?? 0);
    const stars = Number.isFinite(ratingAvg) && ratingCount > 0 ? ratingAvg : 0;
    return (
      <Pressable
        key={`svc-${id}`}
        style={({ pressed }) => [styles.svcCard, pressed && styles.pressed]}
        onPress={() => navigation.push('ListingDetail', { id })}
      >
        <View style={styles.svcImgWrap}>
          {media ? (
            <RemoteImage url={media} style={styles.svcImg} contentFit="cover" />
          ) : (
            <View style={[styles.svcImg, styles.hPh]}>
              <Ionicons name="construct-outline" size={28} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.svcOverlayRow}>
            <View style={styles.svcLogoChip}>
              {avatar ? (
                <RemoteImage url={avatar} style={styles.svcLogoImg} contentFit="cover" />
              ) : (
                <View style={[styles.svcLogoImg, styles.hPh]}>
                  <Ionicons name="briefcase-outline" size={14} color={colors.primaryDark} />
                </View>
              )}
            </View>
            <View style={styles.svcRatingPill}>
              <StarRow rating={stars} />
            </View>
          </View>
        </View>
        <View style={styles.svcBody}>
          <Text style={styles.svcTitle} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.svcSeller} numberOfLines={1}>
            {seller}
          </Text>
          {parts ? (
            <View style={styles.svcPriceRow}>
              <Text style={styles.svcPrice}>{parts.amount}</Text>
              <Text style={styles.svcPriceSuffix}>{parts.suffix}</Text>
            </View>
          ) : (
            <Text style={styles.svcPriceMuted}>See listing</Text>
          )}
        </View>
      </Pressable>
    );
  };

  const localBizCard = (row: Record<string, unknown>) => {
    const id = Number(row.id);
    const name = String(row.business_name ?? '');
    const logo = row.logo_url ? String(row.logo_url) : null;
    const loc = formatDirLocation(row);
    return (
      <View key={`biz-${id}`} style={styles.bizCard}>
        <View style={styles.bizLeft}>
          <View style={styles.bizIconRow}>
            <View style={styles.bizIconWrap}>
              <Ionicons name="storefront-outline" size={18} color={colors.primaryDark} />
            </View>
            <View style={styles.bizTextCol}>
              <Text style={styles.bizName} numberOfLines={2}>
                {name}
              </Text>
              <Text style={styles.bizLoc} numberOfLines={1}>
                {loc}
              </Text>
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.bizBtn, pressed && styles.pressed]}
            onPress={() => navigation.push('DirectoryDetail', { id })}
          >
            <Text style={styles.bizBtnText}>View Profile</Text>
          </Pressable>
        </View>
        <View style={styles.bizThumbWrap}>
          {logo ? (
            <RemoteImage url={logo} style={styles.bizThumb} contentFit="cover" />
          ) : (
            <View style={[styles.bizThumb, styles.hPh]}>
              <Ionicons name="business-outline" size={28} color={colors.textMuted} />
            </View>
          )}
        </View>
      </View>
    );
  };

  const trendCard = (kind: 'product' | 'listing', row: Record<string, unknown>) => {
    const id = Number(row.id);
    const title = String(kind === 'product' ? row.name ?? '' : row.title ?? '');
    const img = kind === 'product' ? (row.image_url ? String(row.image_url) : null) : row.media_url ? String(row.media_url) : null;
    const price =
      kind === 'product'
        ? `${String(row.currency ?? 'USD') === 'USD' ? '$' : `${row.currency} `}${String(row.price_amount ?? '')}`
        : formatPrice(row);
    return (
      <Pressable
        key={`tr-${kind}-${id}`}
        style={({ pressed }) => [styles.trendCard, pressed && styles.pressed]}
        onPress={() =>
          kind === 'product' ? navigation.push('ProductDetail', { id }) : navigation.push('ListingDetail', { id })
        }
      >
        <View style={styles.trendImgWrap}>
          {img ? (
            <RemoteImage url={img} style={styles.trendImg} contentFit="cover" />
          ) : (
            <View style={[styles.trendImg, styles.hPh]}>
              <Ionicons name={kind === 'product' ? 'cube-outline' : 'pricetag-outline'} size={26} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.trendTitle} numberOfLines={2}>
          {title}
        </Text>
        {price ? <Text style={styles.trendPrice}>{price}</Text> : null}
      </Pressable>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={feedRefreshing}
              onRefresh={() => void loadFeed('refresh')}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.topRow} accessibilityRole="header">
            <View style={styles.brandBlock}>
              <Image source={HOME_LOGO} style={styles.brandLogo} resizeMode="cover" accessibilityLabel="WWC logo" />
              <Text style={styles.brandTitle}>WWC</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Notifications"
                onPress={() => {
                  if (isGuest) {
                    showGuestPrompt();
                    return;
                  }
                  setNotifModal(true);
                }}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
                {notifUnread > 0 ? <View style={styles.bellBadge} /> : null}
              </Pressable>
              <Pressable
                accessibilityLabel="Search"
                onPress={() => searchRef.current?.focus()}
                style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
              >
                <Ionicons name="search-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <Text style={styles.welcome}>Welcome back 👋</Text>

          <View style={styles.searchPill}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              ref={searchRef}
              placeholder="Find services, businesses, or items"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={searchQ}
              onChangeText={setSearchQ}
              returnKeyType="search"
              onSubmitEditing={submitSearch}
            />
          </View>

          <Pressable onPress={() => setLocModal(true)} style={({ pressed }) => [styles.locChip, pressed && styles.pressed]}>
            <Ionicons name="location" size={14} color={colors.primaryDark} />
            <Text style={styles.locChipText} numberOfLines={1}>
              {locationLabel}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionCard, styles.actionServices, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Services')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(31, 170, 242, 0.18)' }]}>
                <Ionicons name="clipboard-outline" size={26} color={colors.primaryDark} />
              </View>
              <Text style={styles.actionLabel}>Find{'\n'}Services</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, styles.actionPromote, pressed && styles.pressed]}
              onPress={goPromote}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(31, 170, 242, 0.14)' }]}>
                <Ionicons name="megaphone-outline" size={26} color={colors.primaryDark} />
              </View>
              <Text style={styles.actionLabel}>Promote My{'\n'}Business</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionCard, styles.actionMarket, pressed && styles.pressed]}
              onPress={() => navigation.navigate('Classifieds')}
            >
              <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(200, 162, 74, 0.22)' }]}>
                <Ionicons name="bag-handle-outline" size={26} color={colors.goldDark} />
              </View>
              <Text style={styles.actionLabel}>Browse{'\n'}Marketplace</Text>
            </Pressable>
          </View>

          {feedLoading ? (
            <View style={styles.feedLoad}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : feedErr ? (
            <View style={styles.feedErrBox}>
              <Text style={styles.feedErr}>{feedErr}</Text>
              <Pressable onPress={() => void loadFeed('full')} style={({ pressed }) => [styles.feedRetry, pressed && styles.pressed]}>
                <Text style={styles.feedRetryText}>Try again</Text>
              </Pressable>
            </View>
          ) : feed ? (
            <View style={styles.feedBox}>
              {featuredServices.length
                ? rail(
                    'Featured Services',
                    () => navigation.navigate('Services'),
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                      {featuredServices.map((r) => serviceCard(r))}
                    </ScrollView>
                  )
                : null}

              {feed.directory.length
                ? rail(
                    'Local Businesses',
                    () => navigation.navigate('Directory'),
                    <View style={styles.bizStack}>{feed.directory.slice(0, 3).map((r) => localBizCard(r))}</View>
                  )
                : null}

              {trendingRows.length
                ? rail(
                    'Trending Now',
                    () => navigation.navigate('Classifieds'),
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                      {trendingRows.map((t) => trendCard(t.kind, t.row))}
                    </ScrollView>
                  )
                : null}

              {feed.stores.length
                ? rail(
                    'Online Stores',
                    () => navigation.navigate('Stores'),
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
                      {feed.stores.map((row) => {
                        const id = Number(row.id);
                        const name = String(row.name ?? '');
                        const logo = row.logo_url ? String(row.logo_url) : '';
                        return (
                          <Pressable
                            key={`st-${id}`}
                            style={({ pressed }) => [styles.trendCard, pressed && styles.pressed]}
                            onPress={() => navigation.push('StoreDetailPublic', { id })}
                          >
                            <View style={styles.trendImgWrap}>
                              {logo ? (
                                <RemoteImage url={logo} style={styles.trendImg} contentFit="cover" />
                              ) : (
                                <View style={[styles.trendImg, styles.hPh]}>
                                  <Ionicons name="storefront-outline" size={26} color={colors.textMuted} />
                                </View>
                              )}
                            </View>
                            <Text style={styles.trendTitle} numberOfLines={2}>
                              {name}
                            </Text>
                            <Text style={styles.svcPriceMuted}>Store</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  )
                : null}
            </View>
          ) : null}
        </ScrollView>

        <Modal visible={locModal} animationType="slide" transparent>
          <Pressable style={styles.modalBackdrop} onPress={() => setLocModal(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Locations</Text>
              <Text style={styles.modalHint}>Filter the home feed by country and state (US).</Text>
              <Pressable
                style={styles.modalRow}
                onPress={() => {
                  setCountry(null);
                  setUsState(null);
                  setLocModal(false);
                }}
              >
                <Text style={styles.modalRowText}>All locations</Text>
              </Pressable>
              <TextInput
                placeholder="Search countries"
                placeholderTextColor={colors.textMuted}
                style={styles.modalSearch}
                value={countryQuery}
                onChangeText={setCountryQuery}
              />
              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                style={styles.modalList}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.modalRow}
                    onPress={() => {
                      setCountry(item);
                      setUsState(null);
                      if (item.code !== 'US') setLocModal(false);
                    }}
                  >
                    <Text style={styles.modalRowText}>
                      {item.name} ({item.code})
                    </Text>
                  </Pressable>
                )}
              />
              {country?.code === 'US' ? (
                <>
                  <Text style={styles.modalSubhead}>US state (optional)</Text>
                  <FlatList
                    data={[{ code: '', name: 'All states' } as LocState, ...usStates]}
                    keyExtractor={(item) => item.code || 'all'}
                    style={{ maxHeight: 200 }}
                    renderItem={({ item }) => (
                      <Pressable
                        style={styles.modalRow}
                        onPress={() => {
                          if (!item.code) setUsState(null);
                          else setUsState(item);
                          setLocModal(false);
                        }}
                      >
                        <Text style={styles.modalRowText}>{item.name}</Text>
                      </Pressable>
                    )}
                  />
                </>
              ) : null}
              <Pressable style={styles.modalDone} onPress={() => setLocModal(false)}>
                <Text style={styles.modalDoneText}>Done</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        <NotificationsModal
          visible={notifModal}
          onClose={() => setNotifModal(false)}
          onUnreadChange={setNotifUnread}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 4 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    minHeight: 48,
  },
  brandBlock: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.08)',
  },
  brandTitle: { fontSize: 22, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.08)',
  },
  bellBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  welcome: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginBottom: 2 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(11, 18, 32, 0.05)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 14,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500', paddingVertical: 0 },
  locChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.08)',
    maxWidth: '100%',
  },
  locChipText: { fontSize: 13, fontWeight: '700', color: colors.textMuted, maxWidth: SCREEN_W * 0.55 },
  actionRow: { flexDirection: 'row', gap: ACTION_GAP, marginBottom: 26 },
  actionCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 118,
  },
  actionServices: { backgroundColor: '#D7F0FC' },
  actionPromote: { backgroundColor: '#E4F3FA' },
  actionMarket: { backgroundColor: '#F0E8D8' },
  actionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  feedLoad: { paddingVertical: 28, alignItems: 'center' },
  feedErrBox: { marginBottom: 12 },
  feedErr: { color: '#b91c1c', fontWeight: '600', marginBottom: 10, lineHeight: 20 },
  feedRetry: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.12)',
  },
  feedRetryText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  feedBox: { marginBottom: 8 },
  rail: { marginBottom: 26 },
  railHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  railTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 14, fontWeight: '800', color: colors.primary },
  hScroll: { gap: 12, paddingRight: 8 },
  svcCard: {
    width: FEATURED_CARD_W,
    backgroundColor: colors.white,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  svcImgWrap: { position: 'relative' },
  svcImg: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: colors.primarySoft,
  },
  svcOverlayRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  svcLogoChip: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.white,
    padding: 2,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  svcLogoImg: { width: '100%', height: '100%', borderRadius: 6, backgroundColor: colors.sand },
  svcRatingPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 4,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  svcBody: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 12 },
  svcTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  svcSeller: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginBottom: 8,
  },
  svcPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  svcPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  svcPriceSuffix: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9AA3AF',
  },
  svcPriceMuted: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
  },
  bizStack: { gap: 12 },
  bizCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.06)',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  bizLeft: { flex: 1, justifyContent: 'space-between', minWidth: 0 },
  bizIconRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  bizIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bizTextCol: { flex: 1, minWidth: 0 },
  bizName: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 2 },
  bizLoc: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  bizBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  bizBtnText: { fontSize: 13, fontWeight: '800', color: colors.white },
  bizThumbWrap: { width: 96, height: 96, borderRadius: 14, overflow: 'hidden' },
  bizThumb: { width: '100%', height: '100%', backgroundColor: colors.primarySoft },
  trendCard: {
    width: TREND_CARD_W,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 10,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  trendImgWrap: { overflow: 'hidden' },
  trendImg: {
    width: '100%',
    aspectRatio: 1.15,
    backgroundColor: colors.primarySoft,
  },
  trendTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  trendPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    paddingHorizontal: 10,
  },
  hPh: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.9 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 6 },
  modalHint: { fontSize: 13, color: colors.textMuted, marginBottom: 12 },
  modalSearch: {
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    fontSize: 15,
    color: colors.text,
  },
  modalList: { maxHeight: 280 },
  modalRow: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(11,18,32,0.08)' },
  modalRowText: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalSubhead: { fontSize: 13, fontWeight: '800', color: colors.textMuted, marginTop: 12, marginBottom: 8 },
  modalDone: { marginTop: 16, alignItems: 'center', paddingVertical: 14 },
  modalDoneText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
});

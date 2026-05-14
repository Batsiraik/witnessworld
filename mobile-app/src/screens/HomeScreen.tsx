import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import type { LocCountry, LocState } from '../components/BrowseLocationFilters';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

const SCREEN_W = Dimensions.get('window').width;
const HOME_LOGO = require('../../assets/logo.jpg');
const FEATURED_CARD_W = Math.min(SCREEN_W * 0.74, 300);

type Feed = {
  services: Record<string, unknown>[];
  products: Record<string, unknown>[];
  classifieds: Record<string, unknown>[];
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
    if ((kind === 'service' || kind === 'classified') && o.listing != null && typeof o.listing === 'object') {
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
    stores: arr('stores'),
    directory: arr('directory'),
    featured: normalizeFeatured(f.featured),
  };
}

type TopCategoryRoute = 'Classifieds' | 'Services' | 'Community' | 'Directory' | 'Stores';

const TOP_CATEGORIES: {
  label: string;
  route: TopCategoryRoute;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  iconColor: string;
}[] = [
  { label: 'Marketplace', route: 'Classifieds', icon: 'bag-handle-outline', bg: '#E8F4FD', iconColor: '#1D4ED8' },
  { label: 'Services', route: 'Services', icon: 'construct-outline', bg: '#F3E8FF', iconColor: '#7C3AED' },
  { label: 'Community', route: 'Community', icon: 'people-outline', bg: '#FEF3C7', iconColor: '#B45309' },
  { label: 'Businesses', route: 'Directory', icon: 'business-outline', bg: '#DCFCE7', iconColor: '#15803D' },
  { label: 'Stores', route: 'Stores', icon: 'storefront-outline', bg: '#FFEDD5', iconColor: '#C2410C' },
];

function navigateTopCategory(navigation: Props['navigation'], route: TopCategoryRoute) {
  switch (route) {
    case 'Classifieds':
      navigation.navigate('Classifieds');
      break;
    case 'Services':
      navigation.navigate('Services');
      break;
    case 'Community':
      navigation.navigate('Community');
      break;
    case 'Directory':
      navigation.navigate('Directory');
      break;
    case 'Stores':
      navigation.navigate('Stores');
      break;
    default:
      break;
  }
}

function formatListingLocation(row: Record<string, unknown>): string {
  const st = row.location_us_state ? String(row.location_us_state) : '';
  const c = row.location_country_name ? String(row.location_country_name) : '';
  const parts = [st, c].filter(Boolean);
  return parts.join(', ') || 'Location not set';
}

function formatProductLocation(row: Record<string, unknown>): string {
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

export function HomeScreen({ navigation }: Props) {
  const { isGuest, showGuestPrompt } = useDashboardContext();
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

  const featuredCard = (item: FeaturedRow, showBadge: boolean) => {
    if (item?.kind === 'product' && item.product) {
      const row = item.product;
      const id = Number(row.id);
      const name = String(row.name ?? '');
      const img = row.image_url ? String(row.image_url) : null;
      const price = String(row.price_amount ?? '');
      const cur = String(row.currency ?? 'USD');
      const loc = formatProductLocation(row);
      return (
        <Pressable
          key={`fp-${id}`}
          style={({ pressed }) => [styles.fCard, { width: FEATURED_CARD_W }, pressed && styles.pressed]}
          onPress={() => navigation.push('ProductDetail', { id })}
        >
          <View style={styles.fImgWrap}>
            {img ? (
              <RemoteImage url={img} style={styles.fImg} contentFit="cover" />
            ) : (
              <View style={[styles.fImg, styles.hPh]}>
                <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
              </View>
            )}
            {showBadge ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.fTitle} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.fPrice}>
            {cur} {price}
          </Text>
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.fLoc} numberOfLines={1}>
              {loc}
            </Text>
          </View>
        </Pressable>
      );
    }
    if (item?.listing) {
      const row = item.listing;
      const id = Number(row.id);
      const title = String(row.title ?? '');
      const media = row.media_url ? String(row.media_url) : null;
      const price = row.price_amount ? String(row.price_amount) : null;
      const cur = String(row.currency ?? 'USD');
      const pt = String(row.pricing_type ?? 'fixed');
      const loc = formatListingLocation(row);
      const isFeatured = row.is_featured === true || showBadge;
      const isUrgent = row.is_urgent === true;
      const isVerified = row.is_verified === true;
      return (
        <Pressable
          key={`fl-${id}`}
          style={({ pressed }) => [
            styles.fCard,
            isFeatured && styles.fCardFeatured,
            isUrgent && styles.fCardUrgent,
            { width: FEATURED_CARD_W },
            pressed && styles.pressed,
          ]}
          onPress={() => navigation.push('ListingDetail', { id })}
        >
          <View style={styles.fImgWrap}>
            {media ? (
              <RemoteImage url={media} style={styles.fImg} contentFit="cover" />
            ) : (
              <View style={[styles.fImg, styles.hPh]}>
                <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
              </View>
            )}
            {isFeatured ? (
              <View style={styles.featuredBadge}>
                <Text style={styles.featuredBadgeText}>Featured</Text>
              </View>
            ) : null}
          </View>
          {isUrgent || isVerified ? (
            <View style={styles.flagRow}>
              {isUrgent ? <Text style={[styles.flagBadge, styles.flagUrgent]}>Urgent</Text> : null}
              {isVerified ? <Text style={[styles.flagBadge, styles.flagVerified]}>Verified</Text> : null}
            </View>
          ) : null}
          <Text style={styles.fTitle} numberOfLines={2}>
            {title}
          </Text>
          {price ? (
            <Text style={styles.fPrice}>
              {cur} {price}
              {pt === 'hourly' ? '/hr' : ''}
            </Text>
          ) : (
            <Text style={styles.fPriceMuted}>See listing</Text>
          )}
          <View style={styles.locRow}>
            <Ionicons name="location-outline" size={14} color={colors.textMuted} />
            <Text style={styles.fLoc} numberOfLines={1}>
              {loc}
            </Text>
          </View>
        </Pressable>
      );
    }
    return null;
  };

  const compactListing = (row: Record<string, unknown>, isService: boolean) => {
    const id = Number(row.id);
    const title = String(row.title ?? '');
    const media = row.media_url ? String(row.media_url) : null;
    const price = row.price_amount ? String(row.price_amount) : null;
    const cur = String(row.currency ?? 'USD');
    const pt = String(row.pricing_type ?? 'fixed');
    const loc = formatListingLocation(row);
    const isFeatured = row.is_featured === true;
    const isUrgent = row.is_urgent === true;
    const isVerified = row.is_verified === true;
    return (
      <Pressable
        key={`${isService ? 's' : 'c'}-${id}`}
        style={({ pressed }) => [
          styles.fCard,
          isFeatured && styles.fCardFeatured,
          isUrgent && styles.fCardUrgent,
          { width: FEATURED_CARD_W },
          pressed && styles.pressed,
        ]}
        onPress={() => navigation.push('ListingDetail', { id })}
      >
        <View style={styles.fImgWrap}>
          {media ? (
            <RemoteImage url={media} style={styles.fImg} contentFit="cover" />
          ) : (
            <View style={[styles.fImg, styles.hPh]}>
              <Ionicons name="document-text-outline" size={32} color={colors.textMuted} />
            </View>
          )}
          {isFeatured ? (
            <View style={styles.featuredBadge}>
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          ) : null}
        </View>
        {isUrgent || isVerified ? (
          <View style={styles.flagRow}>
            {isUrgent ? <Text style={[styles.flagBadge, styles.flagUrgent]}>Urgent</Text> : null}
            {isVerified ? <Text style={[styles.flagBadge, styles.flagVerified]}>Verified</Text> : null}
          </View>
        ) : null}
        <Text style={styles.fTitle} numberOfLines={2}>
          {title}
        </Text>
        {price ? (
          <Text style={styles.fPrice}>
            {cur} {price}
            {pt === 'hourly' ? '/hr' : ''}
          </Text>
        ) : (
          <Text style={styles.fPriceMuted}>View</Text>
        )}
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.fLoc} numberOfLines={1}>
            {loc}
          </Text>
        </View>
      </Pressable>
    );
  };

  const compactProduct = (row: Record<string, unknown>) => {
    const id = Number(row.id);
    const name = String(row.name ?? '');
    const img = row.image_url ? String(row.image_url) : null;
    const price = String(row.price_amount ?? '');
    const cur = String(row.currency ?? 'USD');
    const loc = formatProductLocation(row);
    return (
      <Pressable
        key={`p-${id}`}
        style={({ pressed }) => [styles.fCard, { width: FEATURED_CARD_W }, pressed && styles.pressed]}
        onPress={() => navigation.push('ProductDetail', { id })}
      >
        <View style={styles.fImgWrap}>
          {img ? (
            <RemoteImage url={img} style={styles.fImg} contentFit="cover" />
          ) : (
            <View style={[styles.fImg, styles.hPh]}>
              <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.fTitle} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.fPrice}>
          {cur} {price}
        </Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.fLoc} numberOfLines={1}>
            {loc}
          </Text>
        </View>
      </Pressable>
    );
  };

  const compactStore = (row: Record<string, unknown>) => {
    const id = Number(row.id);
    const name = String(row.name ?? '');
    const logo = row.logo_url ? String(row.logo_url) : '';
    const loc = formatListingLocation(row);
    return (
      <Pressable
        key={`st-${id}`}
        style={({ pressed }) => [styles.fCard, { width: FEATURED_CARD_W }, pressed && styles.pressed]}
        onPress={() => navigation.push('StoreDetailPublic', { id })}
      >
        <View style={styles.fImgWrap}>
          {logo ? (
            <RemoteImage url={logo} style={styles.fImg} contentFit="cover" />
          ) : (
            <View style={[styles.fImg, styles.hPh]}>
              <Ionicons name="storefront-outline" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.fTitle} numberOfLines={2}>
          {name}
        </Text>
        <Text style={styles.fPriceMuted}>Store</Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.fLoc} numberOfLines={1}>
            {loc}
          </Text>
        </View>
      </Pressable>
    );
  };

  const compactDir = (row: Record<string, unknown>) => {
    const id = Number(row.id);
    const bn = String(row.business_name ?? '');
    const logo = row.logo_url ? String(row.logo_url) : null;
    const loc = formatDirLocation(row);
    return (
      <Pressable
        key={`d-${id}`}
        style={({ pressed }) => [styles.fCard, { width: FEATURED_CARD_W }, pressed && styles.pressed]}
        onPress={() => navigation.push('DirectoryDetail', { id })}
      >
        <View style={styles.fImgWrap}>
          {logo ? (
            <RemoteImage url={logo} style={styles.fImg} contentFit="cover" />
          ) : (
            <View style={[styles.fImg, styles.hPh]}>
              <Ionicons name="business-outline" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>
        <Text style={styles.fTitle} numberOfLines={2}>
          {bn}
        </Text>
        <Text style={styles.fPriceMuted}>Business</Text>
        <View style={styles.locRow}>
          <Ionicons name="location-outline" size={14} color={colors.textMuted} />
          <Text style={styles.fLoc} numberOfLines={1}>
            {loc}
          </Text>
        </View>
      </Pressable>
    );
  };

  const rail = (title: string, seeAll: () => void, children: ReactNode) => (
    <View style={styles.rail}>
      <View style={styles.railHead}>
        <Text style={styles.railTitle}>{title}</Text>
        <Pressable onPress={seeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all {'>'}</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {children}
      </ScrollView>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
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
              <Image
                source={HOME_LOGO}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="WWC logo"
              />
              <Text style={styles.brandTitle}>WWC</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityLabel="Favorites"
                onPress={() => {
                  if (isGuest) {
                    showGuestPrompt();
                    return;
                  }
                  navigation.navigate('Favorites');
                }}
                style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
              >
                <Ionicons name="heart-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityLabel="My orders"
                onPress={() => {
                  if (isGuest) {
                    showGuestPrompt();
                    return;
                  }
                  navigation.navigate('Orders');
                }}
                style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
              >
                <Ionicons name="receipt-outline" size={22} color={colors.text} />
              </Pressable>
              <Pressable
                accessibilityLabel="Notifications"
                onPress={() => {
                  /* Reserved for future push / notification center */
                }}
                style={({ pressed }) => [styles.bellBtn, pressed && styles.pressed]}
              >
                <Ionicons name="notifications-outline" size={22} color={colors.text} />
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => setLocModal(true)} style={({ pressed }) => [styles.locLine, pressed && styles.pressed]}>
            <Ionicons name="location-outline" size={16} color={colors.primaryDark} />
            <Text style={styles.locLineText}>{locationLabel}</Text>
          </Pressable>

          <View style={styles.searchPill}>
            <Ionicons name="search-outline" size={20} color={colors.textMuted} />
            <TextInput
              placeholder="Search services, products, businesses…"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
              value={searchQ}
              onChangeText={setSearchQ}
              returnKeyType="search"
              onSubmitEditing={() => {
                const q = searchQ.trim();
                if (!q) return;
                navigation.navigate('Services', { initialQuery: q });
              }}
            />
          </View>

          <View style={styles.catRow}>
            {TOP_CATEGORIES.map((c) => (
              <Pressable
                key={c.route}
                onPress={() => navigateTopCategory(navigation, c.route)}
                style={({ pressed }) => [styles.catTile, pressed && styles.pressed]}
              >
                <View style={[styles.catIconWrap, { backgroundColor: c.bg }]}>
                  <Ionicons name={c.icon} size={26} color={c.iconColor} />
                </View>
                <Text style={styles.catLabel} numberOfLines={2}>
                  {c.label}
                </Text>
              </Pressable>
            ))}
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
              {feed.featured?.length
                ? rail('Featured', () => navigation.navigate('Services'), feed.featured.map((f) => featuredCard(f, true)))
                : null}

              {feed && (feed.classifieds.length > 0 || feed.stores.length > 0)
                ? rail('Recommended', () => navigation.navigate('Classifieds'), [
                    ...feed.classifieds.slice(0, 6).map((r) => compactListing(r, false)),
                    ...feed.stores.slice(0, 4).map((r) => compactStore(r)),
                  ])
                : null}

              {feed.services.length
                ? rail('Service marketplace', () => navigation.navigate('Services'), feed.services.map((r) => compactListing(r, true)))
                : null}
              {feed.products.length
                ? rail('Products', () => navigation.navigate('ProductsBrowse'), feed.products.map((r) => compactProduct(r)))
                : null}
              {feed.classifieds.length
                ? rail('Classifieds', () => navigation.navigate('Classifieds'), feed.classifieds.map((r) => compactListing(r, false)))
                : null}
              {feed.stores.length
                ? rail('Online stores', () => navigation.navigate('Stores'), feed.stores.map((r) => compactStore(r)))
                : null}
              {feed.directory.length
                ? rail('Business directory', () => navigation.navigate('Directory'), feed.directory.map((r) => compactDir(r)))
                : null}
            </View>
          ) : null}

          <Text style={styles.footnote}>
            Message sellers from listing and product screens — threads appear in Messages.
          </Text>
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
    marginBottom: 4,
  },
  brandBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
    minHeight: 44,
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 2,
  },
  bellBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.08)',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  locLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  locLineText: { fontSize: 14, fontWeight: '600', color: colors.textMuted, flex: 1 },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.06)',
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500', paddingVertical: 0 },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22, gap: 8 },
  catTile: { flex: 1, alignItems: 'center', maxWidth: (SCREEN_W - 40 - 24) / 4 },
  catIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  catLabel: { fontSize: 11, fontWeight: '700', color: colors.text, textAlign: 'center' },
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
  rail: { marginBottom: 22 },
  railHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  railTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  hScroll: { gap: 14, paddingRight: 8 },
  fCard: {
    marginRight: 0,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    paddingBottom: 12,
  },
  fCardFeatured: { borderWidth: 1, borderColor: 'rgba(200, 162, 74, 0.48)' },
  fCardUrgent: { borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.34)' },
  fImgWrap: { position: 'relative', overflow: 'hidden' },
  /** Landscape hero (~16:9): shorter than the old 1.25 ratio; top corners only, flat bottom against text */
  fImg: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.primarySoft,
  },
  featuredBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: colors.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  featuredBadgeText: { color: colors.white, fontSize: 11, fontWeight: '800' },
  flagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 12, paddingTop: 10 },
  flagBadge: {
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 10,
    fontWeight: '800',
  },
  flagUrgent: { backgroundColor: 'rgba(220, 38, 38, 0.1)', color: colors.danger },
  flagVerified: { backgroundColor: colors.primarySoft, color: colors.primaryDark },
  hPh: { alignItems: 'center', justifyContent: 'center' },
  fTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  fPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  fPriceMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12 },
  fLoc: { fontSize: 12, color: colors.textMuted, fontWeight: '600', flex: 1 },
  pressed: { opacity: 0.9 },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: '500',
  },
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

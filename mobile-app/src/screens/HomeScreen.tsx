import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Home'>;

type ChipKey = 'all' | 'services' | 'products' | 'classifieds' | 'stores' | 'directory';

const CHIPS: { key: ChipKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'services', label: 'Services' },
  { key: 'products', label: 'Products' },
  { key: 'classifieds', label: 'Classifieds' },
  { key: 'stores', label: 'Stores' },
  { key: 'directory', label: 'Directory' },
];

type ExploreRoute = Exclude<
  keyof HomeStackParamList,
  | 'Home'
  | 'Profile'
  | 'ProviderHub'
  | 'CreateListing'
  | 'CreateStore'
  | 'CreateDirectoryEntry'
  | 'DirectoryDetail'
  | 'ListingDetail'
  | 'StoreDetailPublic'
  | 'ProductDetail'
>;

const MODULES: {
  route: ExploreRoute;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    route: 'Classifieds',
    title: 'Classified marketplace',
    subtitle: 'Browse local ads and deals',
    icon: 'grid-outline',
  },
  {
    route: 'Services',
    title: 'Service marketplace',
    subtitle: 'Gigs, skills, and packages',
    icon: 'briefcase-outline',
  },
  {
    route: 'ProductsBrowse',
    title: 'Shop products',
    subtitle: 'Latest items from member stores',
    icon: 'pricetag-outline',
  },
  {
    route: 'Stores',
    title: 'Online stores',
    subtitle: 'Storefronts and brands',
    icon: 'storefront-outline',
  },
  {
    route: 'Directory',
    title: 'Business directory',
    subtitle: 'Call, email, location, and hours',
    icon: 'business-outline',
  },
];

type Feed = {
  services: Record<string, unknown>[];
  products: Record<string, unknown>[];
  classifieds: Record<string, unknown>[];
  stores: Record<string, unknown>[];
  directory: Record<string, unknown>[];
};

export function HomeScreen({ navigation }: Props) {
  const { user } = useDashboardContext();
  const status = user?.status ?? '';
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'there';
  const avatarUri =
    user?.avatar_url && String(user.avatar_url).trim() !== '' ? String(user.avatar_url) : null;

  const [chip, setChip] = useState<ChipKey>('all');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedRefreshing, setFeedRefreshing] = useState(false);
  const [feedErr, setFeedErr] = useState<string | null>(null);

  const loadFeed = useCallback(async (mode: 'full' | 'refresh' = 'full') => {
    if (mode === 'refresh') setFeedRefreshing(true);
    else setFeedLoading(true);
    setFeedErr(null);
    try {
      const sec = chip === 'all' ? 'all' : chip;
      const data = await apiGet(`marketplace-home-feed.php?section=${encodeURIComponent(sec)}&limit=12`, true);
      const f = data.feed as Feed | undefined;
      setFeed(
        f ?? {
          services: [],
          products: [],
          classifieds: [],
          stores: [],
          directory: [],
        }
      );
    } catch (e) {
      setFeedErr(e instanceof Error ? e.message : 'Could not load feed');
      setFeed(null);
    } finally {
      if (mode === 'refresh') setFeedRefreshing(false);
      else setFeedLoading(false);
    }
  }, [chip]);

  useEffect(() => {
    if (status === 'verified') {
      void loadFeed('full');
    }
  }, [loadFeed, status]);

  const show = (key: keyof Feed) => chip === 'all' || chip === key;

  const listingCard = (row: Record<string, unknown>, isService: boolean, wide?: boolean) => {
    const id = Number(row.id);
    const title = String(row.title ?? '');
    const media = row.media_url ? String(row.media_url) : null;
    const price = row.price_amount ? String(row.price_amount) : null;
    const cur = String(row.currency ?? 'USD');
    const pt = String(row.pricing_type ?? 'fixed');
    const sellerLabel = row.seller_label ? String(row.seller_label).trim() : '';
    const sellerUser = row.seller_username ? String(row.seller_username) : '';
    const sellerAvatar = row.seller_avatar_url ? String(row.seller_avatar_url) : null;
    const imgStyle = wide ? styles.hImgWide : styles.hImg;
    return (
      <Pressable
        key={`${isService ? 's' : 'c'}-${id}`}
        style={({ pressed }) => [styles.hCard, wide && styles.hCardWide, pressed && styles.pressed]}
        onPress={() => navigation.push('ListingDetail', { id })}
      >
        {media ? (
          <RemoteImage url={media} style={imgStyle} contentFit="cover" />
        ) : (
          <View style={[imgStyle, styles.hPh]}>
            <Ionicons name="document-text-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={wide ? styles.hCardText : undefined}>
          <Text style={[styles.hTitle, wide && styles.hTitleWide]} numberOfLines={2}>
            {title}
          </Text>
          {sellerLabel || sellerUser ? (
            <View style={styles.feedSeller}>
              {sellerAvatar ? (
                <RemoteImage url={sellerAvatar} style={styles.feedSellerAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.feedSellerAvatar, styles.feedSellerAvatarPh]}>
                  <Ionicons name="person" size={12} color={colors.textMuted} />
                </View>
              )}
              <Text style={styles.feedSellerName} numberOfLines={1}>
                {sellerLabel || `@${sellerUser}`}
              </Text>
            </View>
          ) : null}
          {price ? (
            <Text style={styles.hPrice}>
              {cur} {price}
              {pt === 'hourly' ? '/hr' : ''}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  const productCard = (row: Record<string, unknown>, wide?: boolean) => {
    const id = Number(row.id);
    const name = String(row.name ?? '');
    const img = row.image_url ? String(row.image_url) : null;
    const price = String(row.price_amount ?? '');
    const cur = String(row.currency ?? 'USD');
    const imgStyle = wide ? styles.hImgWide : styles.hImg;
    return (
      <Pressable
        key={`p-${id}`}
        style={({ pressed }) => [styles.hCard, wide && styles.hCardWide, pressed && styles.pressed]}
        onPress={() => navigation.push('ProductDetail', { id })}
      >
        {img ? (
          <RemoteImage url={img} style={imgStyle} contentFit="cover" />
        ) : (
          <View style={[imgStyle, styles.hPh]}>
            <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={wide ? styles.hCardText : undefined}>
          <Text style={[styles.hTitle, wide && styles.hTitleWide]} numberOfLines={2}>
            {name}
          </Text>
          <Text style={styles.hPrice}>
            {cur} {price}
          </Text>
        </View>
      </Pressable>
    );
  };

  const storeCard = (row: Record<string, unknown>, wide?: boolean) => {
    const id = Number(row.id);
    const name = String(row.name ?? '');
    const logo = row.logo_url ? String(row.logo_url) : '';
    const imgStyle = wide ? styles.hImgWide : styles.hImg;
    return (
      <Pressable
        key={`st-${id}`}
        style={({ pressed }) => [styles.hCard, wide && styles.hCardWide, pressed && styles.pressed]}
        onPress={() => navigation.push('StoreDetailPublic', { id })}
      >
        {logo ? (
          <RemoteImage url={logo} style={imgStyle} contentFit="cover" />
        ) : (
          <View style={[imgStyle, styles.hPh]}>
            <Ionicons name="storefront-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={wide ? styles.hCardText : undefined}>
          <Text style={[styles.hTitle, wide && styles.hTitleWide]} numberOfLines={2}>
            {name}
          </Text>
        </View>
      </Pressable>
    );
  };

  const dirCard = (row: Record<string, unknown>, wide?: boolean) => {
    const id = Number(row.id);
    const bn = String(row.business_name ?? '');
    const logo = row.logo_url ? String(row.logo_url) : null;
    const city = String(row.city ?? '');
    const imgStyle = wide ? styles.hImgWide : styles.hImg;
    return (
      <Pressable
        key={`d-${id}`}
        style={({ pressed }) => [styles.hCard, wide && styles.hCardWide, pressed && styles.pressed]}
        onPress={() => navigation.push('DirectoryDetail', { id })}
      >
        {logo ? (
          <RemoteImage url={logo} style={imgStyle} contentFit="cover" />
        ) : (
          <View style={[imgStyle, styles.hPh]}>
            <Ionicons name="business-outline" size={22} color={colors.textMuted} />
          </View>
        )}
        <View style={wide ? styles.hCardText : undefined}>
          <Text style={[styles.hTitle, wide && styles.hTitleWide]} numberOfLines={2}>
            {bn}
          </Text>
          <Text style={styles.hSub} numberOfLines={1}>
            {city}
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
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
        {children}
      </ScrollView>
    </View>
  );

  const stackSection = (title: string, seeAll: () => void, nodes: ReactNode[]) => (
    <View style={styles.stackSec}>
      <View style={styles.railHead}>
        <Text style={styles.railTitle}>{title}</Text>
        <Pressable onPress={seeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <View style={styles.stackList}>{nodes}</View>
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={feedRefreshing}
              onRefresh={() => {
                if (status === 'verified') void loadFeed('refresh');
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
        >
          <View style={styles.greetRow}>
            {avatarUri ? (
              <RemoteImage
                url={avatarUri}
                style={styles.homeAvatar}
                contentFit="cover"
                accessibilityLabel="Your profile"
              />
            ) : (
              <View style={styles.homeAvatarPlaceholder}>
                <Ionicons name="person" size={22} color={colors.primaryDark} />
              </View>
            )}
            <Text style={styles.hello}>Hi, {name}</Text>
          </View>
          <Text style={styles.subHead}>Your community marketplace hub</Text>

          {status === 'verified' ? (
            <View style={styles.badgeOk}>
              <Ionicons name="checkmark-circle" size={18} color="#047857" />
              <Text style={styles.badgeOkText}>Verified</Text>
            </View>
          ) : null}

          {status === 'verified' ? (
            <Pressable
              onPress={() => navigation.navigate('ProviderHub')}
              style={({ pressed }) => [styles.providerCta, pressed && styles.cardPressed]}
            >
              <View style={styles.providerCtaIcon}>
                <Ionicons name="rocket-outline" size={24} color={colors.primaryDark} />
              </View>
              <View style={styles.providerCtaText}>
                <Text style={styles.providerCtaTitle}>Become a service provider</Text>
                <Text style={styles.providerCtaSub}>
                  Post ads, services, directory listings, and open a store — all from one account.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
          ) : null}

          {status === 'verified' ? (
            <>
              <Text style={styles.sectionLabel}>Browse</Text>
              <View style={styles.chipStack}>
                {CHIPS.map((c) => {
                  const active = chip === c.key;
                  return (
                    <Pressable
                      key={c.key}
                      onPress={() => setChip(c.key)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {feedLoading ? (
                <View style={styles.feedLoad}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : feedErr ? (
                <Text style={styles.feedErr}>{feedErr}</Text>
              ) : feed ? (
                <View style={styles.feedBox}>
                  {chip === 'all' ? (
                    <>
                      {show('services') && feed.services.length > 0
                        ? rail(
                            'Service marketplace',
                            () => navigation.navigate('Services'),
                            feed.services.map((r) => listingCard(r, true))
                          )
                        : null}
                      {show('products') && feed.products.length > 0
                        ? rail(
                            'Products for sale',
                            () => navigation.navigate('ProductsBrowse'),
                            feed.products.map((r) => productCard(r))
                          )
                        : null}
                      {show('classifieds') && feed.classifieds.length > 0
                        ? rail(
                            'Classifieds',
                            () => navigation.navigate('Classifieds'),
                            feed.classifieds.map((r) => listingCard(r, false))
                          )
                        : null}
                      {show('stores') && feed.stores.length > 0
                        ? rail(
                            'Stores',
                            () => navigation.navigate('Stores'),
                            feed.stores.map((r) => storeCard(r))
                          )
                        : null}
                      {show('directory') && feed.directory.length > 0
                        ? rail(
                            'Business directory',
                            () => navigation.navigate('Directory'),
                            feed.directory.map((r) => dirCard(r))
                          )
                        : null}
                    </>
                  ) : (
                    <>
                      {chip === 'services' &&
                        (feed.services.length
                          ? stackSection(
                              'Services',
                              () => navigation.navigate('Services'),
                              feed.services.map((r) => listingCard(r, true, true))
                            )
                          : null)}
                      {chip === 'products' &&
                        (feed.products.length
                          ? stackSection(
                              'Products',
                              () => navigation.navigate('ProductsBrowse'),
                              feed.products.map((r) => productCard(r, true))
                            )
                          : null)}
                      {chip === 'classifieds' &&
                        (feed.classifieds.length
                          ? stackSection(
                              'Classifieds',
                              () => navigation.navigate('Classifieds'),
                              feed.classifieds.map((r) => listingCard(r, false, true))
                            )
                          : null)}
                      {chip === 'stores' &&
                        (feed.stores.length
                          ? stackSection(
                              'Stores',
                              () => navigation.navigate('Stores'),
                              feed.stores.map((r) => storeCard(r, true))
                            )
                          : null)}
                      {chip === 'directory' &&
                        (feed.directory.length
                          ? stackSection(
                              'Directory',
                              () => navigation.navigate('Directory'),
                              feed.directory.map((r) => dirCard(r, true))
                            )
                          : null)}
                    </>
                  )}
                </View>
              ) : null}
            </>
          ) : null}

          <Text style={styles.sectionLabel}>Explore</Text>
          {MODULES.map((m) => (
            <Pressable
              key={m.route}
              onPress={() => navigation.navigate(m.route)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardIcon}>
                <Ionicons name={m.icon} size={26} color={colors.primaryDark} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{m.title}</Text>
                <Text style={styles.cardSub}>{m.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
            </Pressable>
          ))}

          <Text style={styles.footnote}>
            Message sellers from listing and product screens — threads appear in Inbox.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
  greetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 4, flexWrap: 'wrap' },
  homeAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.primarySoft,
  },
  homeAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    flex: 1,
    minWidth: 0,
  },
  subHead: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '500',
  },
  badgeOk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  badgeOkText: { fontSize: 13, fontWeight: '700', color: '#047857' },
  providerCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(31, 170, 242, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.35)',
    marginBottom: 20,
  },
  providerCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  providerCtaText: { flex: 1, minWidth: 0 },
  providerCtaTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  providerCtaSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  chipStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.08)',
  },
  chipActive: {
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderColor: 'rgba(13, 148, 136, 0.45)',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.text },
  chipTextActive: { color: '#0f766e' },
  feedLoad: { paddingVertical: 24, alignItems: 'center' },
  feedErr: { color: '#b91c1c', fontWeight: '600', marginBottom: 12 },
  feedBox: { marginBottom: 8 },
  rail: { marginBottom: 20 },
  railHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  railTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
  hScroll: { gap: 12, paddingRight: 8 },
  hCard: {
    width: 164,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  hCardWide: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hCardText: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.9 },
  hImg: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginBottom: 10,
  },
  hImgWide: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    marginBottom: 0,
  },
  hPh: { alignItems: 'center', justifyContent: 'center' },
  hTitle: { fontSize: 14, fontWeight: '800', color: colors.text, minHeight: 38 },
  hTitleWide: { minHeight: 0 },
  feedSeller: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    maxWidth: '100%',
  },
  feedSellerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: colors.primarySoft,
  },
  feedSellerAvatarPh: { alignItems: 'center', justifyContent: 'center' },
  feedSellerName: { flex: 1, fontSize: 11, fontWeight: '700', color: colors.textMuted, minWidth: 0 },
  hSub: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  hPrice: { fontSize: 13, fontWeight: '800', color: colors.primaryDark, marginTop: 6 },
  stackSec: { marginBottom: 20 },
  stackList: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.92 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: '500',
  },
});

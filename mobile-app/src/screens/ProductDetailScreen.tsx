import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFavoriteStatus, apiGet, apiOpenConversation, apiSubmitReport, apiToggleFavorite } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { ReportSheet } from '../components/ReportSheet';
import { ReviewsBlock, type ReviewRow, type ReviewSummary } from '../components/ReviewsBlock';
import { SubjectReviewCTA } from '../components/SubjectReviewCTA';
import { useDashboardContext } from '../context/DashboardContext';
import { useShoppingCart } from '../context/ShoppingCartContext';
import type { HomeStackParamList } from '../navigation/types';
import { openInboxChat } from '../navigation/openInboxChat';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;

type Payload = {
  product: {
    id: number;
    name: string;
    description: string | null;
    specifications: string | null;
    price_amount: string;
    currency: string;
    image_url: string | null;
    moderation_status?: string;
  };
  store: {
    id: number;
    name: string;
    logo_url: string;
    location_country_name: string;
    location_us_state: string | null;
    delivery_type: string;
  };
  seller: { user_id: number; username: string; label: string; avatar_url: string | null };
  review_summary?: ReviewSummary;
  reviews?: ReviewRow[];
};

export function ProductDetailScreen({ navigation, route }: Props) {
  const rawId = route.params?.id;
  const id =
    typeof rawId === 'number' && Number.isFinite(rawId) ? Math.floor(rawId) : Math.floor(Number(rawId));
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const { addProduct } = useShoppingCart();
  const myId = user?.id ?? 0;
  const [row, setRow] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [favoriteOn, setFavoriteOn] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) {
      setErr('Invalid product');
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const j = await apiGet(`product-public-detail.php?id=${id}`, false);
        if (cancelled) return;
        const product = j.product as Payload['product'] | undefined;
        const store = j.store as Payload['store'] | undefined;
        const seller = j.seller as Payload['seller'] | undefined;
        if (!product || !store || !seller) {
          setErr('Not found');
          return;
        }
        setRow({
          product,
          store,
          seller,
          review_summary: j.review_summary as ReviewSummary | undefined,
          reviews: Array.isArray(j.reviews) ? (j.reviews as ReviewRow[]) : [],
        });
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (isGuest || !Number.isFinite(id) || id <= 0) {
      setFavoriteOn(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const on = await apiFavoriteStatus('product', id);
        if (!cancelled) setFavoriteOn(on);
      } catch {
        if (!cancelled) setFavoriteOn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isGuest]);

  const toggleFavorite = useCallback(async () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (!Number.isFinite(id) || id <= 0 || favoriteBusy) return;
    setFavoriteBusy(true);
    try {
      setFavoriteOn(await apiToggleFavorite('product', id, !favoriteOn));
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setFavoriteBusy(false);
    }
  }, [isGuest, showGuestPrompt, id, favoriteBusy, favoriteOn]);

  const addToCartFromProduct = useCallback(() => {
    if (!row) return;
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (row.seller.user_id === myId) return;
    if (row.product.moderation_status === 'pending_approval') return;
    addProduct({
      subject_type: 'product',
      subject_id: row.product.id,
      title: row.product.name,
      image_url: row.product.image_url,
      unit_price: row.product.price_amount,
      currency: row.product.currency,
    });
    Alert.alert('Added to cart', 'You can review everything before checkout.', [
      { text: 'Keep shopping', style: 'cancel' },
      { text: 'View cart', onPress: () => navigation.navigate('Cart') },
    ]);
  }, [row, isGuest, showGuestPrompt, myId, addProduct, navigation]);

  const refreshProduct = useCallback(async () => {
    if (!Number.isFinite(id) || id <= 0) return;
    try {
      const j = await apiGet(`product-public-detail.php?id=${id}`, false);
      const product = j.product as Payload['product'] | undefined;
      const store = j.store as Payload['store'] | undefined;
      const seller = j.seller as Payload['seller'] | undefined;
      if (product && store && seller) {
        setRow({
          product,
          store,
          seller,
          review_summary: j.review_summary as ReviewSummary | undefined,
          reviews: Array.isArray(j.reviews) ? (j.reviews as ReviewRow[]) : [],
        });
      }
    } catch {
      /* keep */
    }
  }, [id]);

  useLayoutEffect(() => {
    const canAddToCart =
      !isGuest &&
      row != null &&
      row.seller.user_id !== myId &&
      row.product.moderation_status !== 'pending_approval';
    navigation.setOptions({
      headerRight: () => (
        <View style={headerCartStyles.row}>
          <Pressable
            onPress={() => void toggleFavorite()}
            disabled={favoriteBusy}
            style={headerCartStyles.wrap}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={favoriteOn ? 'Remove favorite' : 'Save favorite'}
          >
            <Ionicons name={favoriteOn ? 'heart' : 'heart-outline'} size={25} color={favoriteOn ? colors.danger : colors.text} />
          </Pressable>
          {canAddToCart === true ? (
            <Pressable
              onPress={addToCartFromProduct}
              style={headerCartStyles.wrap}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Add to cart"
            >
              <Ionicons name="cart-outline" size={26} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      ),
    });
  }, [navigation, row, myId, isGuest, favoriteOn, favoriteBusy, toggleFavorite, addToCartFromProduct]);

  const contact = async () => {
    if (!row) return;
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (row.seller.user_id === myId) {
      Alert.alert('Yours', 'This is your product.');
      return;
    }
    setBusy(true);
    try {
      const { conversation_id } = await apiOpenConversation({
        peer_user_id: row.seller.user_id,
        context_type: 'product',
        context_id: row.product.id,
      });
      openInboxChat(navigation, conversation_id, row.seller.label, row.seller.user_id, row.seller.username, false);
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const openStore = () => {
    if (!row) return;
    navigation.push('StoreDetailPublic', { id: row.store.id });
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (err || !row) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const { product, store, seller } = row;
  const loc = [store.location_country_name, store.location_us_state].filter(Boolean).join(' · ');
  const pendingApproval = product.moderation_status === 'pending_approval';
  const ownerPreview = pendingApproval && seller.user_id === myId;
  const canAddToCart = !isGuest && seller.user_id !== myId && !pendingApproval;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {ownerPreview ? (
            <View style={styles.ownerNote}>
              <Text style={styles.ownerNoteText}>
                Only you see this until an admin approves your product. Shoppers will see it after approval.
              </Text>
            </View>
          ) : null}
          {product.image_url ? (
            <RemoteImage url={product.image_url} style={styles.hero} contentFit="cover" />
          ) : (
            <View style={[styles.hero, styles.heroPh]}>
              <Ionicons name="cube-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>
            {product.currency} {product.price_amount}
          </Text>
          {canAddToCart ? <PrimaryButton label="Add to cart" onPress={addToCartFromProduct} style={{ marginTop: 16 }} /> : null}
          <ReviewsBlock summary={row.review_summary} reviews={row.reviews} />
          <SubjectReviewCTA
            subjectType="product"
            subjectId={product.id}
            sellerUserId={seller.user_id}
            subjectTitle={product.name}
            onPosted={refreshProduct}
          />

          <Pressable onPress={openStore} style={({ pressed }) => [styles.storeCard, pressed && styles.pressed]}>
            <RemoteImage url={store.logo_url} style={styles.storeLogo} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeLabel}>From store</Text>
              <Text style={styles.storeName}>{store.name}</Text>
              {loc ? <Text style={styles.meta}>{loc}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </Pressable>

          {product.description ? <Text style={styles.body}>{product.description}</Text> : null}
          {product.specifications ? (
            <>
              <Text style={styles.section}>Specifications</Text>
              <Text style={styles.body}>{product.specifications}</Text>
            </>
          ) : null}

          <Text style={styles.section}>Seller</Text>
          <View style={styles.sellerRow}>
            {seller.avatar_url ? (
              <RemoteImage url={seller.avatar_url} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Ionicons name="person" size={22} color={colors.primaryDark} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{seller.label}</Text>
              <Text style={styles.sellerUser}>@{seller.username}</Text>
            </View>
          </View>

          {seller.user_id !== myId ? (
            <PrimaryButton
              label="View profile"
              variant="outline"
              onPress={() => navigation.push('MemberPublicProfile', { userId: seller.user_id })}
              style={styles.viewProfileBtn}
            />
          ) : null}
          {seller.user_id !== myId ? (
            <PrimaryButton label="Contact shop owner" onPress={() => void contact()} loading={busy} />
          ) : null}
          <PrimaryButton
            label="Report this product"
            variant="outline"
            style={styles.reportBtn}
            onPress={() => setReportOpen(true)}
          />
        </ScrollView>
        <ReportSheet
          visible={reportOpen}
          title="Report product"
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason) => {
            await apiSubmitReport({ subject_type: 'product', subject_id: product.id, reason });
            Alert.alert('Thanks', 'Your report was sent to moderation.');
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: '#b91c1c', fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  hero: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    marginBottom: 16,
  },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  price: { fontSize: 22, fontWeight: '800', color: colors.primaryDark, marginTop: 8 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 18,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pressed: { opacity: 0.92 },
  storeLogo: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primarySoft },
  storeLabel: { fontSize: 11, fontWeight: '800', color: colors.primaryDark, textTransform: 'uppercase' },
  storeName: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 2 },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
  body: { fontSize: 15, color: colors.textMuted, marginTop: 16, lineHeight: 22, fontWeight: '500' },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  sellerUser: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  viewProfileBtn: { marginTop: 12 },
  reportBtn: { marginTop: 10 },
  ownerNote: {
    backgroundColor: 'rgba(194, 65, 12, 0.12)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(194, 65, 12, 0.35)',
  },
  ownerNoteText: { fontSize: 13, fontWeight: '600', color: '#9a3412', lineHeight: 18 },
});

const headerCartStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  wrap: { marginRight: 12, padding: 4 },
});

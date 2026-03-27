import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
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
import { apiGet, apiOpenConversation, apiSubmitReport } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { ReportSheet } from '../components/ReportSheet';
import { useDashboardContext } from '../context/DashboardContext';
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
};

export function ProductDetailScreen({ navigation, route }: Props) {
  const rawId = route.params?.id;
  const id =
    typeof rawId === 'number' && Number.isFinite(rawId) ? Math.floor(rawId) : Math.floor(Number(rawId));
  const { user } = useDashboardContext();
  const myId = user?.id ?? 0;
  const [row, setRow] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

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
        const j = await apiGet(`product-public-detail.php?id=${id}`, true);
        if (cancelled) return;
        const product = j.product as Payload['product'] | undefined;
        const store = j.store as Payload['store'] | undefined;
        const seller = j.seller as Payload['seller'] | undefined;
        if (!product || !store || !seller) {
          setErr('Not found');
          return;
        }
        setRow({ product, store, seller });
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

  const contact = async () => {
    if (!row) return;
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
      openInboxChat(navigation, conversation_id, row.seller.label);
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

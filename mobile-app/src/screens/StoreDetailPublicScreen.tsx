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

type Props = NativeStackScreenProps<HomeStackParamList, 'StoreDetailPublic'>;

type ProductMini = {
  id: number;
  name: string;
  price_amount: string;
  currency: string;
  image_url: string | null;
  moderation_status?: string;
};

type Store = {
  id: number;
  name: string;
  description: string;
  sells_summary: string;
  logo_url: string;
  banner_url: string | null;
  location_country_name: string;
  location_us_state: string | null;
  delivery_type: string;
  delivery_notes: string | null;
  seller: { user_id: number; username: string; label: string; avatar_url: string | null };
  products: ProductMini[];
};

export function StoreDetailPublicScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user } = useDashboardContext();
  const myId = user?.id ?? 0;
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet(`store-public-detail.php?id=${id}&products_limit=60`, true);
        if (cancelled) return;
        const S = data.store as Store | undefined;
        if (!S) {
          setErr('Not found');
          return;
        }
        setStore(S);
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
    if (!store) return;
    if (store.seller.user_id === myId) {
      Alert.alert('Yours', 'This is your store.');
      return;
    }
    setBusy(true);
    try {
      const { conversation_id } = await apiOpenConversation({
        peer_user_id: store.seller.user_id,
        context_type: 'store',
        context_id: store.id,
      });
      openInboxChat(navigation, conversation_id, store.seller.label);
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
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

  if (err || !store) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const loc = [store.location_country_name, store.location_us_state].filter(Boolean).join(' · ');

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {store.banner_url ? (
            <RemoteImage url={store.banner_url} style={styles.banner} contentFit="cover" />
          ) : null}
          <View style={styles.headRow}>
            <RemoteImage url={store.logo_url} style={styles.logo} contentFit="cover" />
          </View>
          <Text style={styles.title}>{store.name}</Text>
          <Text style={styles.summary}>{store.sells_summary}</Text>
          {loc ? <Text style={styles.meta}>{loc}</Text> : null}
          <Text style={styles.meta}>Delivery: {store.delivery_type.replace(/_/g, ' ')}</Text>
          {store.delivery_notes ? <Text style={styles.body}>{store.delivery_notes}</Text> : null}
          <Text style={styles.body}>{store.description}</Text>

          <Text style={styles.section}>Products</Text>
          {store.products.length === 0 ? (
            <Text style={styles.empty}>No approved products yet.</Text>
          ) : (
            store.products.map((p) => (
              <Pressable
                key={p.id}
                style={({ pressed }) => [styles.pRow, pressed && styles.pPressed]}
                onPress={() => navigation.navigate('ProductDetail', { id: p.id })}
              >
                {p.image_url ? (
                  <RemoteImage url={p.image_url} style={styles.pImg} contentFit="cover" />
                ) : (
                  <View style={[styles.pImg, styles.pPh]}>
                    <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.pName} numberOfLines={2}>
                    {p.name}
                  </Text>
                  {p.moderation_status === 'pending_approval' ? (
                    <Text style={styles.pPending}>Pending approval</Text>
                  ) : null}
                  <Text style={styles.pPrice}>
                    {p.currency} {p.price_amount}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))
          )}

          <Text style={styles.section}>Owner</Text>
          <View style={styles.sellerRow}>
            {store.seller.avatar_url ? (
              <RemoteImage url={store.seller.avatar_url} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Ionicons name="person" size={22} color={colors.primaryDark} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{store.seller.label}</Text>
              <Text style={styles.sellerUser}>@{store.seller.username}</Text>
            </View>
          </View>

          <View style={styles.ctaBlock}>
            {store.seller.user_id !== myId ? (
              <PrimaryButton label="Contact shop owner" onPress={() => void contact()} loading={busy} />
            ) : null}
            <PrimaryButton
              label="Report this store"
              variant="outline"
              style={styles.reportBtn}
              onPress={() => setReportOpen(true)}
            />
          </View>
        </ScrollView>
        <ReportSheet
          visible={reportOpen}
          title="Report store"
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason) => {
            await apiSubmitReport({ subject_type: 'store', subject_id: store.id, reason });
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
  scroll: { paddingBottom: 40 },
  banner: { width: '100%', height: 140, backgroundColor: colors.primarySoft },
  headRow: { paddingHorizontal: 20, marginTop: -36 },
  logo: {
    width: 88,
    height: 88,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.card,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, paddingHorizontal: 20, marginTop: 12 },
  summary: { fontSize: 15, fontWeight: '600', color: colors.text, paddingHorizontal: 20, marginTop: 8 },
  meta: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 20, marginTop: 6, fontWeight: '600' },
  body: { fontSize: 15, color: colors.textMuted, paddingHorizontal: 20, marginTop: 14, lineHeight: 22 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 22,
    paddingHorizontal: 20,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: { paddingHorizontal: 20, marginTop: 8, color: colors.textMuted, fontWeight: '600' },
  pRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pPressed: { opacity: 0.92 },
  pImg: { width: 56, height: 56, borderRadius: 10, backgroundColor: colors.primarySoft },
  pPh: { alignItems: 'center', justifyContent: 'center' },
  pName: { fontSize: 15, fontWeight: '800', color: colors.text },
  pPending: { fontSize: 11, fontWeight: '800', color: '#c2410c', marginTop: 4 },
  pPrice: { fontSize: 14, fontWeight: '800', color: colors.primaryDark, marginTop: 4 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, marginTop: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  sellerUser: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  ctaBlock: { paddingHorizontal: 20, marginTop: 16, gap: 10 },
  reportBtn: { marginTop: 0 },
});

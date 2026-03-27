import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'StoreManage'>;

type ProductRow = {
  id: number;
  name: string;
  price_amount: string;
  currency: string;
  image_url: string | null;
  moderation_status: string;
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ');
}

function statusColor(s: string): string {
  switch (s) {
    case 'approved':
      return '#047857';
    case 'pending_approval':
      return '#c2410c';
    case 'rejected':
      return '#64748b';
    case 'removed':
      return '#b91c1c';
    default:
      return colors.textMuted;
  }
}

export function StoreManageScreen({ navigation, route }: Props) {
  const storeId = route.params.storeId;
  const [storeName, setStoreName] = useState('');
  const [storeStatus, setStoreStatus] = useState('');
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGet(`store-products.php?store_id=${storeId}`, true);
        setStoreStatus(String(data.store_moderation_status || ''));
        const list = data.products;
        setProducts(Array.isArray(list) ? (list as ProductRow[]) : []);
        const detail = await apiGet(`store-detail.php?id=${storeId}`, true);
        const S = detail.store as Record<string, unknown> | undefined;
        if (S?.name) setStoreName(String(S.name));
      } catch {
        setProducts([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [storeId]
  );

  useFocusEffect(
    useCallback(() => {
      void load('full');
    }, [load])
  );

  const canManageProducts = storeStatus === 'approved';

  const confirmDelete = (item: ProductRow) => {
    Alert.alert('Delete product', `Remove “${item.name}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteProduct(item.id),
      },
    ]);
  };

  const deleteProduct = async (id: number) => {
    try {
      await apiPost('product-delete.php', { product_id: id }, true);
      await load('full');
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.header}>
          <Text style={styles.title}>{storeName || 'Your store'}</Text>
          <View style={[styles.badge, { borderColor: statusColor(storeStatus) }]}>
            <Text style={[styles.badgeText, { color: statusColor(storeStatus) }]}>{statusLabel(storeStatus)}</Text>
          </View>
          {!canManageProducts ? (
            <Text style={styles.blocked}>
              This store is not approved yet—or it is suspended. You can’t add or remove products until it’s approved and active.
            </Text>
          ) : null}
          <Pressable
            onPress={() => navigation.navigate('EditStore', { storeId })}
            style={({ pressed }) => [styles.outlineBtn, pressed && styles.pressed]}
          >
            <Text style={styles.outlineBtnText}>Edit storefront</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!canManageProducts) {
                Alert.alert(
                  'Not available',
                  'Wait for admin approval of your store before adding products.'
                );
                return;
              }
              navigation.navigate('EditProduct', { storeId });
            }}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Ionicons name="add-circle-outline" size={22} color="#fff" />
            <Text style={styles.primaryBtnText}>Add product</Text>
          </Pressable>
        </View>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={products.length === 0 ? styles.emptyGrow : styles.listPad}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                {canManageProducts ? 'No products yet. Tap Add product.' : 'Products will appear here after your store is approved.'}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  {item.image_url ? (
                    <RemoteImage url={item.image_url} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="cube-outline" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.price}>
                      {item.currency} {item.price_amount}
                    </Text>
                    <View style={[styles.miniBadge, { borderColor: statusColor(item.moderation_status) }]}>
                      <Text style={[styles.miniBadgeText, { color: statusColor(item.moderation_status) }]}>
                        {statusLabel(item.moderation_status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => {
                      if (!canManageProducts) return;
                      navigation.navigate('EditProduct', { storeId, productId: item.id });
                    }}
                    style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnPrimaryText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      if (!canManageProducts) return;
                      confirmDelete(item);
                    }}
                    style={({ pressed }) => [styles.btn, styles.btnDanger, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnDangerText}>Delete</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 10 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  blocked: { fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '600' },
  outlineBtn: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '700', color: colors.text },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },
  emptyGrow: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'center' },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 15, fontWeight: '500' },
  card: {
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginBottom: 4,
  },
  cardRow: { flexDirection: 'row', gap: 12 },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.primarySoft },
  thumbPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  price: { fontSize: 14, fontWeight: '700', color: colors.primaryDark, marginTop: 4 },
  miniBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  miniBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary },
  btnPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnDanger: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  btnDangerText: { color: '#b91c1c', fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.9 },
});

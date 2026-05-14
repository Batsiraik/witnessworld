import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Orders'>;

export type CommerceRequestRow = {
  id: number;
  buyer_user_id: number;
  seller_user_id: number;
  subject_title: string;
  subject_type: 'product' | 'listing' | 'directory_entry' | 'member';
  subject_id: number;
  request_type: string;
  status: string;
  quantity: number;
  unit_price: string | null;
  currency: string;
  seller_label: string;
  seller_username: string | null;
  created_at: string;
  tracking_number?: string | null;
};

function labelForStatus(s: string): string {
  return s.replace(/_/g, ' ');
}

export function OrdersScreen({ navigation }: Props) {
  const { isGuest, showGuestPrompt } = useDashboardContext();
  const [rows, setRows] = useState<CommerceRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (isGuest) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet('commerce-requests-list.php?role=buyer', true);
      setRows(Array.isArray(data.requests) ? (data.requests as CommerceRequestRow[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isGuest]);

  const onRefresh = useCallback(async () => {
    if (isGuest) return;
    setRefreshing(true);
    try {
      const data = await apiGet('commerce-requests-list.php?role=buyer', true);
      setRows(Array.isArray(data.requests) ? (data.requests as CommerceRequestRow[]) : []);
    } catch {
      /* keep */
    } finally {
      setRefreshing(false);
    }
  }, [isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (isGuest) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.box}>
            <Text style={styles.title}>My orders</Text>
            <Text style={styles.body}>Sign in to see product orders and hire requests you have placed.</Text>
            <PrimaryButton label="Sign in or create account" onPress={showGuestPrompt} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} colors={[colors.primary]} />
          }
          ListHeaderComponent={
            <View style={styles.listHead}>
              <Text style={styles.title}>My orders</Text>
              <Text style={styles.body}>Store purchases and hire requests you sent as a buyer.</Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>No orders yet. Start from a product, service, or business listing.</Text>}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate('OrderDetail', { id: item.id })}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.subject_title}</Text>
                <Text style={styles.status}>{labelForStatus(item.status)}</Text>
              </View>
              <Text style={styles.meta}>Seller: {item.seller_label || item.seller_username || 'WWC seller'}</Text>
              {item.unit_price ? (
                <Text style={styles.meta}>
                  {item.currency} {item.unit_price} × {item.quantity}
                </Text>
              ) : null}
              <Text style={styles.metaSmall}>{item.request_type.replace(/_/g, ' ')} · #{item.id}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: { flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.textMuted },
  list: { padding: 18, paddingBottom: 34 },
  listHead: { marginBottom: 14 },
  empty: { marginTop: 24, textAlign: 'center', color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  pressed: { opacity: 0.92 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '800', color: colors.goldDark, textTransform: 'capitalize' },
  meta: { marginTop: 6, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  metaSmall: { marginTop: 4, fontSize: 12, color: colors.textMuted, fontWeight: '600', textTransform: 'capitalize' },
});

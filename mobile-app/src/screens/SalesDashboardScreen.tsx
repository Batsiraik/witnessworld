import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'SalesDashboard'>;

type SaleRow = {
  id: number;
  subject_title: string;
  request_type: string;
  status: string;
  quantity: number;
  unit_price: string | null;
  currency: string;
  buyer_name: string;
  buyer_email: string | null;
  buyer_phone: string | null;
  shipping_name: string | null;
  shipping_address1: string | null;
  shipping_address2: string | null;
  shipping_city: string | null;
  shipping_state: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  project_brief: string | null;
  tracking_number: string | null;
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ');
}

export function SalesDashboardScreen(_: Props) {
  const [rows, setRows] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trackingById, setTrackingById] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('commerce-requests-list.php?role=seller', true);
      setRows(Array.isArray(data.requests) ? (data.requests as SaleRow[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const action = async (requestId: number, nextAction: string) => {
    try {
      await apiPost(
        'commerce-request-action.php',
        { request_id: requestId, action: nextAction, tracking_number: trackingById[requestId] ?? '' },
        true
      );
      await load();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
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

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title}>Sales dashboard</Text>
              <Text style={styles.body}>
                Accept requests only when you can fulfill them. Keep WWC chat records and update shipping or delivery status.
              </Text>
            </View>
          }
          ListEmptyComponent={<Text style={styles.empty}>No sales or hire requests yet.</Text>}
          renderItem={({ item }) => {
            const shippingLine = [
              item.shipping_address1,
              item.shipping_address2,
              item.shipping_city,
              item.shipping_state,
              item.shipping_postal_code,
              item.shipping_country,
            ]
              .filter(Boolean)
              .join(', ');
            return (
              <View style={styles.card}>
                <View style={styles.top}>
                  <Text style={styles.cardTitle}>{item.subject_title}</Text>
                  <Text style={styles.status}>{statusLabel(item.status)}</Text>
                </View>
                <Text style={styles.meta}>Buyer: {item.buyer_name}</Text>
                {item.buyer_email ? <Text style={styles.meta}>Email: {item.buyer_email}</Text> : null}
                {item.buyer_phone ? <Text style={styles.meta}>Phone: {item.buyer_phone}</Text> : null}
                {item.unit_price ? (
                  <Text style={styles.meta}>
                    {item.currency} {item.unit_price} × {item.quantity}
                  </Text>
                ) : null}
                {shippingLine ? (
                  <Text style={styles.details}>Ship to {item.shipping_name || item.buyer_name}: {shippingLine}</Text>
                ) : null}
                {item.project_brief ? <Text style={styles.details}>{item.project_brief}</Text> : null}
                {['accepted', 'in_progress', 'ready'].includes(item.status) ? (
                  <TextInput
                    value={trackingById[item.id] ?? item.tracking_number ?? ''}
                    onChangeText={(v) => setTrackingById((m) => ({ ...m, [item.id]: v }))}
                    placeholder="Tracking number (for shipped items)"
                    style={styles.input}
                  />
                ) : null}
                <View style={styles.actions}>
                  {item.status === 'new' ? (
                    <>
                      <Pressable onPress={() => void action(item.id, 'accept')} style={styles.btn}>
                        <Text style={styles.btnText}>Accept</Text>
                      </Pressable>
                      <Pressable onPress={() => void action(item.id, 'decline')} style={[styles.btn, styles.mutedBtn]}>
                        <Text style={styles.mutedText}>Decline</Text>
                      </Pressable>
                    </>
                  ) : null}
                  {['accepted', 'ready'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'in_progress')} style={styles.btn}>
                      <Text style={styles.btnText}>Start work</Text>
                    </Pressable>
                  ) : null}
                  {['accepted', 'in_progress'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'ready')} style={styles.btn}>
                      <Text style={styles.btnText}>Ready</Text>
                    </Pressable>
                  ) : null}
                  {['accepted', 'in_progress', 'ready'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'shipped')} style={styles.btn}>
                      <Text style={styles.btnText}>Mark shipped</Text>
                    </Pressable>
                  ) : null}
                  {!['completed', 'cancelled', 'declined'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'dispute')} style={[styles.btn, styles.dangerBtn]}>
                      <Text style={styles.dangerText}>Dispute</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 18, paddingBottom: 34 },
  header: { marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 10 },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  empty: { marginTop: 24, textAlign: 'center', color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '800', color: colors.goldDark, textTransform: 'capitalize' },
  meta: { marginTop: 6, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  details: { marginTop: 10, fontSize: 13, lineHeight: 19, color: colors.text, fontWeight: '600' },
  input: { marginTop: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', color: colors.text },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: { borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 8 },
  btnText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  mutedBtn: { backgroundColor: 'rgba(11, 18, 32, 0.06)' },
  mutedText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  dangerBtn: { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
  dangerText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
});

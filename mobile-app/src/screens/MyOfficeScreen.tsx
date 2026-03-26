import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'MyOffice'>;

type Row = {
  id: number;
  listing_type: string;
  title: string;
  moderation_status: string;
  media_url: string | null;
  location_country_name: string | null;
  location_us_state: string | null;
  created_at: string;
};

type StoreRow = {
  id: number;
  name: string;
  logo_url: string;
  moderation_status: string;
  sells_summary: string;
};

type DirRow = {
  id: number;
  business_name: string;
  city: string;
  category_label: string;
  moderation_status: string;
};

function statusLabel(s: string): string {
  return s.replace(/_/g, ' ');
}

function listingTypeLabel(t: string): string {
  if (t === 'service') return 'Service';
  if (t === 'classified') return 'Classified';
  return t;
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
    case 'suspended':
      return '#b91c1c';
    default:
      return colors.textMuted;
  }
}

export function MyOfficeScreen({ navigation }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [dirEntries, setDirEntries] = useState<DirRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    try {
      const L = await apiGet('my-listings.php', true);
      const list = L.listings;
      setRows(Array.isArray(list) ? (list as Row[]) : []);
    } catch {
      setRows([]);
    }
    try {
      const S = await apiGet('my-stores.php', true);
      const sl = S.stores;
      setStores(Array.isArray(sl) ? (sl as StoreRow[]) : []);
    } catch {
      setStores([]);
    }
    try {
      const D = await apiGet('my-directory-entries.php', true);
      const dl = D.entries;
      setDirEntries(Array.isArray(dl) ? (dl as DirRow[]) : []);
    } catch {
      setDirEntries([]);
    } finally {
      if (mode === 'refresh') setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load('full');
    }, [load])
  );

  const confirmDelete = (item: Row) => {
    Alert.alert(
      'Delete listing',
      `Remove “${item.title}”? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void deleteListing(item.id),
        },
      ]
    );
  };

  const deleteListing = async (id: number) => {
    try {
      await apiPost('listing-delete.php', { listing_id: id }, true);
      await load('full');
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const confirmDeleteStore = (s: StoreRow) => {
    Alert.alert('Delete store', `Remove “${s.name}”? You can only delete pending or rejected stores.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteStore(s.id),
      },
    ]);
  };

  const deleteStore = async (id: number) => {
    try {
      await apiPost('store-delete.php', { store_id: id }, true);
      await load('full');
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const confirmDeleteDir = (d: DirRow) => {
    Alert.alert('Delete listing', `Remove “${d.business_name}”? Only pending or rejected listings can be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => void deleteDir(d.id),
      },
    ]);
  };

  const deleteDir = async (id: number) => {
    try {
      await apiPost('directory-entry-delete.php', { entry_id: id }, true);
      await load('full');
    } catch (e) {
      Alert.alert('Could not delete', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const directoryHeader = (
    <View style={styles.storeBlock}>
      <Text style={styles.sectionLabel}>Business directory</Text>
      {dirEntries.length === 0 ? (
        <Text style={styles.storeEmpty}>Add a listing from Home → Become a service provider.</Text>
      ) : (
        dirEntries.map((d) => {
          const canDelete = d.moderation_status === 'pending_approval' || d.moderation_status === 'rejected';
          const suspended = d.moderation_status === 'suspended';
          return (
            <View key={d.id} style={styles.storeCard}>
              <View style={styles.storeTop}>
                <View style={styles.dirIconPh}>
                  <Ionicons name="business-outline" size={20} color="#0e7490" />
                </View>
                <View style={styles.storeBody}>
                  <Text style={styles.storeName} numberOfLines={2}>
                    {d.business_name}
                  </Text>
                  <Text style={styles.storeSub} numberOfLines={2}>
                    {d.category_label} · {d.city}
                  </Text>
                  <View style={[styles.badge, { borderColor: statusColor(d.moderation_status) }]}>
                    <Text style={[styles.badgeText, { color: statusColor(d.moderation_status) }]}>
                      {statusLabel(d.moderation_status)}
                    </Text>
                  </View>
                </View>
              </View>
              {suspended ? (
                <Text style={styles.suspendNote}>This directory listing is suspended.</Text>
              ) : null}
              <View style={styles.storeActions}>
                {!suspended ? (
                  <Pressable
                    onPress={() => navigation.navigate('EditDirectoryEntry', { entryId: d.id })}
                    style={({ pressed }) => [styles.storeBtn, styles.btnDir, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnDirText}>Edit listing</Text>
                  </Pressable>
                ) : null}
                {canDelete ? (
                  <Pressable
                    onPress={() => confirmDeleteDir(d)}
                    style={({ pressed }) => [styles.storeBtn, styles.btnDangerSm, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnDangerText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
    </View>
  );

  const storeHeader = (
    <View style={styles.storeBlock}>
      <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Your stores</Text>
      {stores.length === 0 ? (
        <Text style={styles.storeEmpty}>Open a store from Home → Become a service provider.</Text>
      ) : (
        stores.map((s) => {
          const approved = s.moderation_status === 'approved';
          const canDelete = s.moderation_status === 'pending_approval' || s.moderation_status === 'rejected';
          const suspended = s.moderation_status === 'suspended';
          return (
            <View key={s.id} style={styles.storeCard}>
              <View style={styles.storeTop}>
                {s.logo_url ? (
                  <Image source={{ uri: s.logo_url }} style={styles.storeLogo} />
                ) : (
                  <View style={styles.storeLogoPh}>
                    <Ionicons name="storefront-outline" size={20} color={colors.textMuted} />
                  </View>
                )}
                <View style={styles.storeBody}>
                  <Text style={styles.storeName} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <Text style={styles.storeSub} numberOfLines={2}>
                    {s.sells_summary}
                  </Text>
                  <View style={[styles.badge, { borderColor: statusColor(s.moderation_status) }]}>
                    <Text style={[styles.badgeText, { color: statusColor(s.moderation_status) }]}>
                      {statusLabel(s.moderation_status)}
                    </Text>
                  </View>
                </View>
              </View>
              {suspended ? (
                <Text style={styles.suspendNote}>This store is suspended. Contact support if you think this is a mistake.</Text>
              ) : null}
              <View style={styles.storeActions}>
                {approved ? (
                  <Pressable
                    onPress={() => navigation.navigate('StoreManage', { storeId: s.id })}
                    style={({ pressed }) => [styles.storeBtn, styles.btnStore, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnStoreText}>Manage store</Text>
                  </Pressable>
                ) : null}
                {!suspended ? (
                  <Pressable
                    onPress={() => navigation.navigate('EditStore', { storeId: s.id })}
                    style={({ pressed }) => [styles.storeBtn, styles.btnSecondary, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnSecondaryText}>Edit storefront</Text>
                  </Pressable>
                ) : null}
                {canDelete ? (
                  <Pressable
                    onPress={() => confirmDeleteStore(s)}
                    style={({ pressed }) => [styles.storeBtn, styles.btnDangerSm, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnDangerText}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })
      )}
      <Text style={[styles.sectionLabel, styles.sectionSpacer]}>Classifieds & services</Text>
    </View>
  );

  const listHeader = (
    <>
      {directoryHeader}
      {storeHeader}
    </>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.topPad}>
          <Text style={styles.lead}>
            Manage directory listings, stores, products, and classified ads. Edits to approved directory entries or
            stores send them back for admin review.
          </Text>
        </View>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={rows.length === 0 ? styles.emptyGrow : styles.listPad}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <Text style={styles.empty}>No listings yet. Post one from Home → Become a service provider.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardRow}>
                  {item.media_url ? (
                    <Image source={{ uri: item.media_url }} style={styles.thumb} />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Ionicons name="image-outline" size={22} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardMeta}>
                      {listingTypeLabel(item.listing_type)}
                      {[item.location_country_name, item.location_us_state].filter(Boolean).length
                        ? ' · ' + [item.location_country_name, item.location_us_state].filter(Boolean).join(' · ')
                        : ''}
                    </Text>
                    <View style={[styles.badge, { borderColor: statusColor(item.moderation_status) }]}>
                      <Text style={[styles.badgeText, { color: statusColor(item.moderation_status) }]}>
                        {statusLabel(item.moderation_status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => navigation.navigate('EditListing', { listingId: item.id })}
                    style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
                  >
                    <Text style={styles.btnPrimaryText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => confirmDelete(item)}
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
  topPad: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  lead: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontWeight: '500',
  },
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
  cardMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  badgeText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnPrimary: { backgroundColor: 'rgba(31, 170, 242, 0.15)', borderWidth: 1, borderColor: 'rgba(31, 170, 242, 0.4)' },
  btnPrimaryText: { fontWeight: '800', color: colors.primaryDark },
  btnDanger: { backgroundColor: 'rgba(220, 38, 38, 0.08)', borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.35)' },
  btnDangerText: { fontWeight: '800', color: colors.danger },
  pressed: { opacity: 0.9 },
  storeBlock: { marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  sectionSpacer: { marginTop: 20, marginBottom: 10 },
  storeEmpty: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 4, fontWeight: '500' },
  storeCard: {
    marginTop: 12,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  storeTop: { flexDirection: 'row', gap: 12 },
  storeLogo: { width: 56, height: 56, borderRadius: 14, backgroundColor: colors.primarySoft },
  storeLogoPh: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeBody: { flex: 1, minWidth: 0 },
  storeName: { fontSize: 16, fontWeight: '800', color: colors.text },
  storeSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  suspendNote: { fontSize: 12, color: '#b45309', marginTop: 10, fontWeight: '600' },
  storeActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  storeBtn: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, alignItems: 'center' },
  btnStore: { backgroundColor: 'rgba(109, 40, 217, 0.12)', borderWidth: 1, borderColor: 'rgba(109, 40, 217, 0.35)' },
  btnStoreText: { fontWeight: '800', color: '#6d28d9' },
  btnSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  btnSecondaryText: { fontWeight: '800', color: colors.text },
  btnDangerSm: {
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
  },
  dirIconPh: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(14, 116, 144, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDir: { backgroundColor: 'rgba(14, 116, 144, 0.12)', borderWidth: 1, borderColor: 'rgba(14, 116, 144, 0.35)' },
  btnDirText: { fontWeight: '800', color: '#0e7490' },
});

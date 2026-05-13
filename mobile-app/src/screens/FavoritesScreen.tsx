import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiFavoritesList, type FavoriteRow } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Favorites'>;

function typeLabel(type: FavoriteRow['subject_type']): string {
  if (type === 'product') return 'Product';
  if (type === 'store') return 'Store';
  if (type === 'directory_entry') return 'Business';
  return 'Listing';
}

export function FavoritesScreen({ navigation }: Props) {
  const { isGuest, showGuestPrompt } = useDashboardContext();
  const [rows, setRows] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (isGuest) {
        setLoading(false);
        setRows([]);
        showGuestPrompt();
        return;
      }
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErr(null);
      try {
        setRows(await apiFavoritesList());
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load favorites.');
        setRows([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [isGuest, showGuestPrompt]
  );

  useFocusEffect(
    useCallback(() => {
      void load('full');
    }, [load])
  );

  const open = (item: FavoriteRow) => {
    if (item.subject_type === 'product') navigation.push('ProductDetail', { id: item.subject_id });
    else if (item.subject_type === 'store') navigation.push('StoreDetailPublic', { id: item.subject_id });
    else if (item.subject_type === 'directory_entry') navigation.push('DirectoryDetail', { id: item.subject_id });
    else navigation.push('ListingDetail', { id: item.subject_id });
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
        {err ? <Text style={styles.err}>{err}</Text> : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => `${item.subject_type}-${item.subject_id}`}
          contentContainerStyle={rows.length === 0 ? styles.emptyPad : styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load('refresh')}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="heart-outline" size={42} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No favorites yet</Text>
              <Text style={styles.emptyText}>Tap the heart on listings, stores, products, or businesses to save them here.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              {item.image_url ? (
                <RemoteImage url={item.image_url} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPh]}>
                  <Ionicons name="heart" size={22} color={colors.primaryDark} />
                </View>
              )}
              <View style={styles.body}>
                <View style={styles.typePill}>
                  <Text style={styles.typeText}>{typeLabel(item.subject_type)}</Text>
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                {item.subtitle ? <Text style={styles.sub} numberOfLines={1}>{item.subtitle}</Text> : null}
                {item.meta ? <Text style={styles.meta} numberOfLines={1}>{item.meta}</Text> : null}
                {item.price ? <Text style={styles.price}>{item.price}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          )}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  err: { marginHorizontal: 20, marginTop: 8, color: colors.danger, fontWeight: '700' },
  listPad: { padding: 20, paddingBottom: 32 },
  emptyPad: { flexGrow: 1, padding: 20 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: '800', color: colors.text },
  emptyText: { marginTop: 6, textAlign: 'center', color: colors.textMuted, lineHeight: 20, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 72, height: 72, borderRadius: 14, backgroundColor: colors.primarySoft },
  thumbPh: { alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  typePill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 5,
  },
  typeText: { fontSize: 11, fontWeight: '800', color: colors.primaryDark },
  title: { fontSize: 15, fontWeight: '800', color: colors.text, lineHeight: 19 },
  sub: { marginTop: 3, fontSize: 13, fontWeight: '700', color: colors.textMuted },
  meta: { marginTop: 3, fontSize: 12, fontWeight: '600', color: colors.textMuted },
  price: { marginTop: 5, fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  pressed: { opacity: 0.9 },
});

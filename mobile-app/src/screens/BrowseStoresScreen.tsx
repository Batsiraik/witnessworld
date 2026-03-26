import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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
import { BrowseLocationFilters, type LocCountry, type LocState } from '../components/BrowseLocationFilters';
import { GradientBackground } from '../components/GradientBackground';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Stores'>;

type Row = {
  id: number;
  name: string;
  sells_summary: string;
  logo_url: string;
  location_country_name: string;
  location_us_state: string | null;
};

export function BrowseStoresScreen({ navigation }: Props) {
  const [selectedCountry, setSelectedCountry] = useState<LocCountry | null>(null);
  const [selectedUsState, setSelectedUsState] = useState<LocState | null>(null);
  const [q, setQ] = useState('');
  const [appliedQ, setAppliedQ] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedCountry?.code) p.set('country', selectedCountry.code.toUpperCase());
    if (selectedUsState?.name) p.set('us_state', selectedUsState.name);
    if (appliedQ.trim()) p.set('q', appliedQ.trim());
    p.set('limit', '50');
    return p.toString();
  }, [selectedCountry, selectedUsState, appliedQ]);

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      setErr(null);
      try {
        const data = await apiGet(`marketplace-stores.php?${qs}`, true);
        const L = data.stores;
        setRows(Array.isArray(L) ? (L as Row[]) : []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Error');
        setRows([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [qs]
  );

  useEffect(() => {
    void load('full');
  }, [load]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.filters}>
          <BrowseLocationFilters
            country={selectedCountry}
            usState={selectedUsState}
            onCountryChange={setSelectedCountry}
            onUsStateChange={setSelectedUsState}
          />
          <TextInput
            style={styles.input}
            placeholder="Search store name"
            placeholderTextColor={colors.textMuted}
            value={q}
            onChangeText={setQ}
          />
          <Pressable onPress={() => setAppliedQ(q)} style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply filters</Text>
            <Ionicons name="checkmark-circle-outline" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : err ? (
          <ScrollView
            contentContainerStyle={styles.errScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <Text style={styles.err}>{err}</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={styles.listPad}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={<Text style={styles.empty}>No stores match.</Text>}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => navigation.navigate('StoreDetailPublic', { id: item.id })}
              >
                <Image source={{ uri: item.logo_url }} style={styles.logo} />
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={2}>
                    {item.sells_summary}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {[item.location_country_name, item.location_us_state].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filters: { paddingHorizontal: 16, paddingTop: 8, gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.card,
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    marginBottom: 8,
  },
  applyText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  center: { padding: 40, alignItems: 'center' },
  listPad: { paddingHorizontal: 16, paddingBottom: 24 },
  errScroll: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 8 },
  err: { color: '#b91c1c', padding: 16, fontWeight: '600' },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.92 },
  logo: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.primarySoft },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  meta: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
});

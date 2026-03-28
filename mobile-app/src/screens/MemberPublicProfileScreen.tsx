import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'MemberPublicProfile'>;

type Member = {
  user_id: number;
  username: string;
  label: string;
  avatar_url: string | null;
};

type ListingMini = {
  id: number;
  listing_type: string;
  title: string;
  media_url: string;
  price_amount: string | null;
  currency: string;
  pricing_type: string;
};

export function MemberPublicProfileScreen({ navigation, route }: Props) {
  const { userId } = route.params;
  const { stackNavigation } = useDashboardContext();
  const [member, setMember] = useState<Member | null>(null);
  const [listings, setListings] = useState<ListingMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: member?.label || 'Profile' });
  }, [navigation, member?.label]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await apiGet(`member-public.php?user_id=${userId}`, true);
        if (cancelled) return;
        const m = data.member as Member | undefined;
        const L = data.listings;
        if (!m) {
          setErr('Not found');
          setMember(null);
          setListings([]);
          return;
        }
        setMember(m);
        setListings(Array.isArray(L) ? (L as ListingMini[]) : []);
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : 'Error');
          setMember(null);
          setListings([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (err || !member) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const hireLabel = `Hire (${member.username})`;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.head}>
            {member.avatar_url && String(member.avatar_url).trim() !== '' ? (
              <RemoteImage url={member.avatar_url} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Text style={styles.avatarLetter}>{member.label.slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <Text style={styles.name}>{member.label}</Text>
            <Text style={styles.user}>@{member.username}</Text>
          </View>

          <PrimaryButton label={hireLabel} onPress={() => stackNavigation.navigate('HireComingSoon', { username: member.username })} />

          <Text style={styles.section}>Marketplace listings</Text>
          {listings.length === 0 ? (
            <Text style={styles.empty}>No public marketplace listings yet.</Text>
          ) : (
            listings.map((it) => (
              <Pressable
                key={it.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => navigation.push('ListingDetail', { id: it.id })}
              >
                {it.media_url ? (
                  <RemoteImage url={it.media_url} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]} />
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {it.title}
                  </Text>
                  <Text style={styles.cardMeta}>
                    {it.listing_type === 'service' ? 'Service' : 'Classified'}
                    {it.price_amount
                      ? ` · ${it.currency} ${it.price_amount}${it.pricing_type === 'hourly' ? ' / hr' : ''}`
                      : ''}
                  </Text>
                </View>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: '#b91c1c', fontWeight: '700' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 12 },
  head: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.primarySoft,
    marginBottom: 14,
  },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 36, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  user: { fontSize: 14, fontWeight: '600', color: colors.textMuted, marginTop: 6 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 28,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  empty: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.92 },
  thumb: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.primarySoft },
  thumbPh: {},
  cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  cardMeta: { fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 4 },
});

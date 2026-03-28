import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
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
import { ListingVideoBlock } from '../components/ListingVideoBlock';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { ReportSheet } from '../components/ReportSheet';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { openInboxChat } from '../navigation/openInboxChat';
import { colors } from '../theme/colors';
import { resolvePublicMediaUrl } from '../utils/mediaUrl';

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingDetail'>;

type Listing = {
  id: number;
  listing_type: string;
  title: string;
  description: string;
  price_amount: string | null;
  pricing_type: string;
  currency: string;
  media_url: string;
  video_url: string;
  portfolio_urls: string[];
  soft_skills: string[];
  location_country_name: string | null;
  location_us_state: string | null;
  seller: { user_id: number; username: string; label: string; avatar_url: string | null };
};

export function ListingDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user, stackNavigation } = useDashboardContext();
  const myId = user?.id ?? 0;
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);

  const loadedIdRef = useRef<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const fullLoad = loadedIdRef.current !== id;
      if (fullLoad) {
        loadedIdRef.current = id;
      }

      (async () => {
        if (fullLoad) {
          setLoading(true);
          setErr(null);
          try {
            const data = await apiGet(`listing-public-detail.php?id=${id}`, true);
            if (cancelled) return;
            const L = data.listing as Listing | undefined;
            if (!L) {
              setErr('Not found');
              setListing(null);
              return;
            }
            setListing(L);
          } catch (e) {
            if (!cancelled) {
              setErr(e instanceof Error ? e.message : 'Error');
              setListing(null);
            }
          } finally {
            if (!cancelled) setLoading(false);
          }
        } else {
          try {
            const data = await apiGet(`listing-public-detail.php?id=${id}`, true);
            if (cancelled) return;
            const L = data.listing as Listing | undefined;
            if (L) {
              setListing(L);
              setErr(null);
            }
          } catch {
            /* keep existing listing */
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [id])
  );

  const contact = async () => {
    if (!listing) return;
    if (listing.seller.user_id === myId) {
      Alert.alert('Yours', 'This is your own listing.');
      return;
    }
    setContactBusy(true);
    try {
      const { conversation_id } = await apiOpenConversation({
        peer_user_id: listing.seller.user_id,
        context_type: 'listing',
        context_id: listing.id,
      });
      openInboxChat(
        navigation,
        conversation_id,
        listing.seller.label || listing.seller.username,
        listing.seller.user_id,
        listing.seller.username
      );
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : 'Error');
    } finally {
      setContactBusy(false);
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

  if (err || !listing) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const contactLabel =
    listing.listing_type === 'classified' ? 'Contact seller' : 'Contact provider';
  const loc = [listing.location_country_name, listing.location_us_state].filter(Boolean).join(' · ');

  const videoUri = resolvePublicMediaUrl(listing.video_url?.trim() || '') ?? '';
  const hasVideo = videoUri.length > 0;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {listing.media_url ? (
            <RemoteImage url={listing.media_url} style={styles.hero} contentFit="cover" />
          ) : null}
          {hasVideo ? (
            <>
              <Text style={styles.section}>Video</Text>
              <ListingVideoBlock uri={videoUri} style={styles.heroVideo} />
            </>
          ) : null}
          <Text style={styles.title}>{listing.title}</Text>
          {loc ? <Text style={styles.loc}>{loc}</Text> : null}
          {listing.price_amount ? (
            <Text style={styles.price}>
              {listing.currency} {listing.price_amount}
              {listing.pricing_type === 'hourly' ? ' / hr' : ''}
            </Text>
          ) : null}
          {listing.soft_skills.length > 0 ? (
            <View style={styles.chips}>
              {listing.soft_skills.slice(0, 12).map((s) => (
                <View key={s} style={styles.chip}>
                  <Text style={styles.chipText}>{s}</Text>
                </View>
              ))}
            </View>
          ) : null}
          <Text style={styles.body}>{listing.description}</Text>

          {listing.portfolio_urls.length > 0 ? (
            <>
              <Text style={styles.section}>Portfolio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portRow}>
                {listing.portfolio_urls.map((u) => (
                  <RemoteImage key={u} url={u} style={styles.portImg} contentFit="cover" />
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.section}>Posted by</Text>
          <View style={styles.sellerRow}>
            {listing.seller.avatar_url ? (
              <RemoteImage url={listing.seller.avatar_url} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Ionicons name="person" size={22} color={colors.primaryDark} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{listing.seller.label}</Text>
              <Text style={styles.sellerUser}>@{listing.seller.username}</Text>
            </View>
          </View>

          {listing.seller.user_id !== myId ? (
            <PrimaryButton
              label="View profile"
              variant="outline"
              onPress={() => navigation.push('MemberPublicProfile', { userId: listing.seller.user_id })}
              style={styles.viewProfileBtn}
            />
          ) : null}
          {listing.seller.user_id !== myId ? (
            <PrimaryButton label={contactLabel} onPress={() => void contact()} loading={contactBusy} />
          ) : null}
          {listing.seller.user_id !== myId ? (
            <PrimaryButton
              label={`Hire (${listing.seller.username})`}
              variant="outline"
              onPress={() =>
                stackNavigation.navigate('HireComingSoon', { username: listing.seller.username })
              }
            />
          ) : null}
          <PrimaryButton
            label="Report this listing"
            onPress={() => setReportOpen(true)}
            variant="outline"
            style={styles.reportBtn}
          />
        </ScrollView>
        <ReportSheet
          visible={reportOpen}
          title="Report listing"
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason) => {
            await apiSubmitReport({ subject_type: 'listing', subject_id: listing.id, reason });
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
    aspectRatio: 1.2,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    marginBottom: 16,
  },
  heroVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    marginBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  loc: { fontSize: 13, color: colors.textMuted, marginTop: 8, fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, marginTop: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  body: { fontSize: 15, color: colors.textMuted, marginTop: 16, lineHeight: 22, fontWeight: '500' },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 22,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  portRow: { marginTop: 10, marginHorizontal: -4 },
  portImg: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: colors.primarySoft,
  },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  sellerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  sellerUser: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  viewProfileBtn: { marginTop: 12 },
  reportBtn: { marginTop: 10 },
});

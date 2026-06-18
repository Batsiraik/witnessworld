import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFavoriteStatus, apiGet, apiOpenConversation, apiSubmitReport, apiToggleFavorite } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { ListingVideoBlock } from '../components/ListingVideoBlock';
import { RemoteImage } from '../components/RemoteImage';
import { ReportSheet } from '../components/ReportSheet';
import { ReviewsBlock, type ReviewRow, type ReviewSummary } from '../components/ReviewsBlock';
import { SubjectReviewCTA } from '../components/SubjectReviewCTA';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { openInboxChat } from '../navigation/openInboxChat';
import { openOfficeEditListing } from '../navigation/openOfficeEditListing';
import { colors } from '../theme/colors';
import { resolvePublicMediaUrl } from '../utils/mediaUrl';

type Props = NativeStackScreenProps<HomeStackParamList, 'ListingDetail'>;

type Listing = {
  id: number;
  listing_type: string;
  category_name?: string | null;
  title: string;
  description: string;
  price_amount: string | null;
  is_free?: boolean;
  is_featured?: boolean;
  is_urgent?: boolean;
  is_verified?: boolean;
  pricing_type: string;
  currency: string;
  media_url: string;
  video_url: string;
  portfolio_urls: string[];
  soft_skills: string[];
  location_country_name: string | null;
  location_us_state: string | null;
  created_at?: string;
  seller: { user_id: number; username: string; label: string; avatar_url: string | null };
  review_summary?: ReviewSummary;
  reviews?: ReviewRow[];
};

const PAGE_BG = '#F4F5F7';
const CTA_PURPLE = '#5A5FE1';
const PRICE_PURPLE = '#5A5FE1';

function formatRelativeTime(iso: string | undefined): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Date.now() - t;
  if (diff < 0) return '';
  const days = Math.floor(diff / (86400 * 1000));
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
}

function humanizeListingType(t: string): string {
  const s = String(t || '').toLowerCase();
  if (s === 'classified') return 'Classified';
  if (s === 'service') return 'Service';
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
}

export function ListingDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const myId = user?.id ?? 0;
  const insets = useSafeAreaInsets();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [heartOn, setHeartOn] = useState(false);
  const [heartBusy, setHeartBusy] = useState(false);

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
            const data = await apiGet(`listing-public-detail.php?id=${id}`, false);
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
            const data = await apiGet(`listing-public-detail.php?id=${id}`, false);
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

  useEffect(() => {
    if (isGuest) {
      setHeartOn(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const on = await apiFavoriteStatus('listing', id);
        if (!cancelled) setHeartOn(on);
      } catch {
        if (!cancelled) setHeartOn(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isGuest]);

  const refreshListing = useCallback(async () => {
    try {
      const data = await apiGet(`listing-public-detail.php?id=${id}`, false);
      const L = data.listing as Listing | undefined;
      if (L) setListing(L);
    } catch {
      /* keep */
    }
  }, [id]);

  const toggleFavorite = async () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (heartBusy) return;
    setHeartBusy(true);
    try {
      setHeartOn(await apiToggleFavorite('listing', id, !heartOn));
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setHeartBusy(false);
    }
  };

  const contact = async () => {
    if (!listing) return;
    if (isGuest) {
      showGuestPrompt();
      return;
    }
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
        listing.seller.username,
        listing.listing_type === 'service'
      );
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : 'Error');
    } finally {
      setContactBusy(false);
    }
  };

  const goProfile = () => {
    if (!listing) return;
    navigation.push('MemberPublicProfile', { userId: listing.seller.user_id });
  };

  const onShare = async () => {
    if (!listing) return;
    try {
      const desc = listing.description ?? '';
      const body = desc.slice(0, 400) + (desc.length > 400 ? '…' : '');
      await Share.share({
        message: `${listing.title}\n\n${body}`,
        title: listing.title,
      });
    } catch {
      /* dismissed */
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (err || !listing) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
          <Pressable onPress={() => navigation.goBack()} style={styles.errBack}>
            <Text style={styles.errBackText}>Go back</Text>
          </Pressable>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const softSkills = Array.isArray(listing.soft_skills) ? listing.soft_skills : [];
  const portfolioUrls = Array.isArray(listing.portfolio_urls) ? listing.portfolio_urls : [];
  const descriptionText = listing.description ?? '';

  const contactLabel =
    listing.listing_type === 'classified' ? 'Message seller' : 'Message provider';
  const loc = [listing.location_country_name, listing.location_us_state].filter(Boolean).join(', ');
  const videoUri = resolvePublicMediaUrl(listing.video_url?.trim() || '') ?? '';
  const hasVideo = videoUri.length > 0;
  const isOwn = listing.seller.user_id === myId;
  const showContactFooter = !isOwn;
  const showOwnerFooter = isOwn && !isGuest;
  const footerPad = showContactFooter || showOwnerFooter ? 140 + insets.bottom : 24 + insets.bottom;
  const postedAgo = formatRelativeTime(listing.created_at);
  const typeLabel = humanizeListingType(listing.listing_type);
  const skillTag = softSkills[0];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: footerPad }]}
      >
        <View style={styles.heroWrap}>
          {listing.media_url ? (
            <RemoteImage url={listing.media_url} style={styles.hero} contentFit="cover" />
          ) : (
            <View style={[styles.hero, styles.heroPh]}>
              <Ionicons name="image-outline" size={48} color={colors.textMuted} />
            </View>
          )}
          <SafeAreaView edges={['top']} style={styles.heroOverlay}>
            <View style={styles.heroBar}>
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [styles.heroIconBtn, pressed && styles.pressed]}
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={colors.white} />
              </Pressable>
              <View style={styles.heroBarEnd}>
                <Pressable
                  onPress={() => void onShare()}
                  style={({ pressed }) => [styles.heroIconBtn, pressed && styles.pressed]}
                  accessibilityLabel="Share"
                >
                  <Ionicons name="share-outline" size={20} color={colors.white} />
                </Pressable>
                <Pressable
                  onPress={() => void toggleFavorite()}
                  disabled={heartBusy}
                  style={({ pressed }) => [styles.heroIconBtn, pressed && styles.pressed]}
                  accessibilityLabel="Favorite"
                >
                  <Ionicons name={heartOn ? 'heart' : 'heart-outline'} size={20} color={colors.white} />
                </Pressable>
              </View>
            </View>
          </SafeAreaView>
        </View>

        <View
          style={[
            styles.sheet,
            { backgroundColor: PAGE_BG },
            listing.is_featured && styles.sheetFeatured,
            listing.is_urgent && styles.sheetUrgent,
          ]}
        >
          {hasVideo ? (
            <View style={styles.videoBlock}>
              <ListingVideoBlock uri={videoUri} style={styles.heroVideo} />
            </View>
          ) : null}

          <View style={styles.tags}>
            {typeLabel ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{typeLabel}</Text>
              </View>
            ) : null}
            {listing.category_name ? (
              <View style={[styles.tag, styles.tagCat]}>
                <Text style={styles.tagText}>{listing.category_name}</Text>
              </View>
            ) : null}
            {listing.is_featured ? (
              <View style={[styles.tag, styles.tagFeatured]}>
                <Text style={[styles.tagText, styles.tagFeaturedText]}>Featured</Text>
              </View>
            ) : null}
            {listing.is_urgent ? (
              <View style={[styles.tag, styles.tagUrgent]}>
                <Text style={[styles.tagText, styles.tagUrgentText]}>Urgent</Text>
              </View>
            ) : null}
            {listing.is_verified ? (
              <View style={[styles.tag, styles.tagVerified]}>
                <Text style={[styles.tagText, styles.tagVerifiedText]}>Verified</Text>
              </View>
            ) : null}
            {skillTag ? (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{skillTag}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.title}>{listing.title}</Text>

          {listing.is_free ? (
            <Text style={styles.priceFree}>FREE</Text>
          ) : listing.price_amount ? (
            <Text style={styles.price}>
              {listing.currency} {listing.price_amount}
              {listing.pricing_type === 'hourly' ? '/hr' : ''}
            </Text>
          ) : null}

          <View style={styles.metaRow}>
            {loc ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.metaText}>{loc}</Text>
              </View>
            ) : null}
            {postedAgo ? (
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={styles.metaText}>{postedAgo}</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.subHeading}>Description</Text>
          <Text style={styles.body}>{descriptionText}</Text>
          <ReviewsBlock summary={listing.review_summary} reviews={listing.reviews} />
          <SubjectReviewCTA
            subjectType="listing"
            subjectId={listing.id}
            sellerUserId={listing.seller.user_id}
            subjectTitle={listing.title}
            onPosted={refreshListing}
          />

          {portfolioUrls.length > 0 ? (
            <>
              <Text style={styles.subHeading}>Portfolio</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portRow}>
                {portfolioUrls.map((u) => (
                  <RemoteImage key={u} url={u} style={styles.portImg} contentFit="cover" />
                ))}
              </ScrollView>
            </>
          ) : null}

          <Text style={styles.subHeading}>Posted by</Text>
          <Pressable
            onPress={goProfile}
            style={({ pressed }) => [styles.sellerCard, pressed && styles.pressed]}
          >
            {listing.seller.avatar_url ? (
              <RemoteImage url={listing.seller.avatar_url} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.avatarPh]}>
                <Text style={styles.avatarLetter}>
                  {(listing.seller.label || listing.seller.username || '?').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.sellerInfo}>
              <Text style={styles.sellerName}>{listing.seller.label || listing.seller.username}</Text>
              <Text style={styles.sellerUser}>@{listing.seller.username}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>

          {isOwn ? (
            <Text style={styles.ownNote}>
              This is your listing. Tap Edit below to change photos or details, or open My office from
              Profile to manage all your ads.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {showOwnerFooter ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={() => openOfficeEditListing(navigation, listing.id)}
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed]}
            accessibilityLabel="Edit listing"
          >
            <Ionicons name="create-outline" size={22} color={colors.white} />
            <Text style={styles.ctaPrimaryText}>Edit listing</Text>
          </Pressable>
        </View>
      ) : showContactFooter ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={() => void contact()}
            disabled={contactBusy}
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.pressed, contactBusy && styles.ctaDisabled]}
          >
            {contactBusy ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.white} />
                <Text style={styles.ctaPrimaryText}>{contactLabel}</Text>
              </>
            )}
          </Pressable>
          <View style={styles.footerLinks}>
            <Pressable onPress={goProfile} style={({ pressed }) => [styles.footerLinkHit, pressed && styles.pressed]}>
              <Text style={styles.footerLinkText}>View profile</Text>
            </Pressable>
            {listing.listing_type === 'service' ? (
              <>
                <Text style={styles.footerDot}>·</Text>
                <Pressable
                  onPress={() => {
                    if (isGuest) {
                      showGuestPrompt();
                      return;
                    }
                    navigation.navigate('Cart', { subjectType: 'listing', subjectId: listing.id });
                  }}
                  style={({ pressed }) => [styles.footerLinkHit, pressed && styles.pressed]}
                >
                  <Text style={styles.footerLinkText}>Hire</Text>
                </Pressable>
              </>
            ) : null}
            <Text style={styles.footerDot}>·</Text>
            <Pressable
              onPress={() => {
                if (isGuest) {
                  showGuestPrompt();
                  return;
                }
                setReportOpen(true);
              }}
              style={({ pressed }) => [styles.footerLinkHit, pressed && styles.pressed]}
            >
              <Text style={styles.footerLinkReport}>Report</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <ReportSheet
        visible={reportOpen}
        title="Report listing"
        onClose={() => setReportOpen(false)}
        onSubmit={async (reason) => {
          await apiSubmitReport({ subject_type: 'listing', subject_id: listing.id, reason });
          Alert.alert('Thanks', 'Your report was sent to moderation.');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PAGE_BG },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: '#b91c1c', fontWeight: '700' },
  errBack: { marginTop: 16, paddingVertical: 12, paddingHorizontal: 20 },
  errBackText: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  scroll: { flexGrow: 1 },
  heroWrap: { position: 'relative' },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: colors.primarySoft,
  },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  heroOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  heroBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  heroBarEnd: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(11, 18, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    borderTopWidth: 1,
    borderTopColor: 'transparent',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -18,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  sheetFeatured: { borderTopColor: 'rgba(200, 162, 74, 0.6)' },
  sheetUrgent: { borderTopColor: 'rgba(220, 38, 38, 0.35)' },
  videoBlock: {
    marginBottom: 8,
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  heroVideo: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#0f172a',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 18, 32, 0.06)',
  },
  tagText: { fontSize: 12, fontWeight: '700', color: colors.text },
  tagCat: { backgroundColor: 'rgba(5, 150, 105, 0.1)' },
  tagFeatured: { backgroundColor: colors.goldSoft },
  tagFeaturedText: { color: colors.goldDark },
  tagUrgent: { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
  tagUrgentText: { color: colors.danger },
  tagVerified: { backgroundColor: colors.primarySoft },
  tagVerifiedText: { color: colors.primaryDark },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, lineHeight: 30 },
  price: { fontSize: 20, fontWeight: '800', color: PRICE_PURPLE, marginTop: 10 },
  priceFree: { fontSize: 20, fontWeight: '800', color: '#059669', marginTop: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  subHeading: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 22, marginBottom: 8 },
  body: { fontSize: 15, color: colors.textMuted, lineHeight: 23, fontWeight: '500' },
  portRow: { marginTop: 4, marginHorizontal: -4 },
  portImg: {
    width: 120,
    height: 120,
    borderRadius: 14,
    marginRight: 10,
    backgroundColor: colors.primarySoft,
  },
  sellerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(90, 95, 225, 0.15)' },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '800', color: CTA_PURPLE },
  sellerInfo: { flex: 1 },
  sellerName: { fontSize: 16, fontWeight: '800', color: colors.text },
  sellerUser: { fontSize: 13, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
  ownNote: { marginTop: 16, fontSize: 14, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: CTA_PURPLE,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  ctaPrimaryText: { fontSize: 16, fontWeight: '800', color: colors.white },
  ctaDisabled: { opacity: 0.75 },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 12,
    paddingBottom: 4,
  },
  footerLinkHit: { paddingVertical: 6, paddingHorizontal: 8 },
  footerLinkText: { fontSize: 14, fontWeight: '800', color: CTA_PURPLE },
  footerLinkReport: { fontSize: 14, fontWeight: '700', color: colors.danger },
  footerDot: { fontSize: 14, color: colors.textMuted, fontWeight: '700', marginHorizontal: 2 },
  pressed: { opacity: 0.88 },
});

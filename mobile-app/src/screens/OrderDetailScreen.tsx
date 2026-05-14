import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiOpenConversation, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { openInboxChat } from '../navigation/openInboxChat';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'OrderDetail'>;

export type OrderDetailPayload = {
  id: number;
  buyer_user_id: number;
  seller_user_id: number;
  subject_type: string;
  subject_id: number;
  subject_title: string;
  subject_image_url: string | null;
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
  preferred_contact: string | null;
  seller_note: string | null;
  tracking_number: string | null;
  created_at: string;
  updated_at: string;
  buyer_label: string;
  buyer_username: string | null;
  seller_label: string;
  seller_username: string | null;
};

export type SubjectPreviewPayload = {
  kind: string;
  title: string;
  hero_image_url: string | null;
  subtitle: string | null;
  description: string | null;
  specifications: string | null;
  gallery_urls: string[];
  meta_line: string | null;
  store_name?: string | null;
};

function labelForStatus(s: string): string {
  return s.replace(/_/g, ' ');
}

function subjectTypeLabel(t: string): string {
  if (t === 'listing') return 'Listing';
  if (t === 'product') return 'Product';
  if (t === 'directory_entry') return 'Directory';
  if (t === 'member') return 'Member';
  return t;
}

export function OrderDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const myId = user?.id ?? 0;
  const [row, setRow] = useState<OrderDetailPayload | null>(null);
  const [subjectPreview, setSubjectPreview] = useState<SubjectPreviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [msgBusy, setMsgBusy] = useState(false);

  useEffect(() => {
    if (row?.tracking_number) setTrackingInput(row.tracking_number);
    else setTrackingInput('');
  }, [row?.id, row?.tracking_number]);

  const load = useCallback(async () => {
    if (isGuest) {
      setErr('Sign in required');
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGet(`commerce-request-detail.php?id=${id}`, true);
      const r = data.request as OrderDetailPayload | undefined;
      if (!r) {
        setErr('Not found');
        setRow(null);
        setSubjectPreview(null);
        return;
      }
      setRow(r);
      setSubjectPreview((data.subject_preview as SubjectPreviewPayload | undefined) ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
      setRow(null);
      setSubjectPreview(null);
    } finally {
      setLoading(false);
    }
  }, [id, isGuest]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const action = async (nextAction: string) => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    try {
      await apiPost(
        'commerce-request-action.php',
        { request_id: id, action: nextAction, tracking_number: trackingInput.trim() },
        true
      );
      await load();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const confirmCancelOrder = () => {
    Alert.alert(
      'Cancel this order?',
      'The seller will be notified. This cannot be undone from the app.',
      [
        { text: 'No', style: 'cancel' },
        { text: 'Yes, cancel', style: 'destructive', onPress: () => void action('cancel') },
      ]
    );
  };

  const submitReview = async () => {
    if (!row) return;
    if (!reviewBody.trim()) {
      Alert.alert('Review required', 'Please write a short review.');
      return;
    }
    setReviewBusy(true);
    try {
      await apiPost(
        'content-review-create.php',
        {
          request_id: row.id,
          rating: reviewRating,
          title: reviewTitle.trim(),
          body: reviewBody.trim(),
        },
        true
      );
      Alert.alert('Review posted', 'Thanks for helping other members make safer choices.');
      setReviewOpen(false);
    } catch (e) {
      Alert.alert('Could not post review', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setReviewBusy(false);
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

  if (isGuest || err || !row) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{isGuest ? 'Sign in to view this order.' : err || 'Not found'}</Text>
          {isGuest ? <PrimaryButton label="Sign in" onPress={showGuestPrompt} style={{ marginTop: 16 }} /> : null}
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const isBuyer = row.buyer_user_id === myId;
  const isSeller = row.seller_user_id === myId;
  const status = row.status;
  const preview = subjectPreview;
  const heroUrl = preview?.hero_image_url || row.subject_image_url;
  const headline = (preview?.title || row.subject_title).trim();
  const galleryUrls = (() => {
    const raw = Array.isArray(preview?.gallery_urls)
      ? preview.gallery_urls.filter((u): u is string => typeof u === 'string' && u.length > 0)
      : [];
    const uniq: string[] = [];
    for (const u of raw) {
      if (!uniq.includes(u)) uniq.push(u);
    }
    return uniq;
  })();

  const showViewSubject = ['listing', 'product', 'directory_entry', 'member'].includes(row.subject_type) && row.subject_id > 0;

  const openSubject = () => {
    if (row.subject_type === 'listing') navigation.push('ListingDetail', { id: row.subject_id });
    else if (row.subject_type === 'product') navigation.push('ProductDetail', { id: row.subject_id });
    else if (row.subject_type === 'directory_entry') navigation.push('DirectoryDetail', { id: row.subject_id });
    else if (row.subject_type === 'member') navigation.push('MemberPublicProfile', { userId: row.subject_id });
  };

  const viewSubjectLabel =
    row.subject_type === 'listing'
      ? 'View full listing'
      : row.subject_type === 'product'
        ? 'View product page'
        : row.subject_type === 'directory_entry'
          ? 'View directory listing'
          : row.subject_type === 'member'
            ? 'View profile'
            : 'View item';

  const messageBuyer = async () => {
    if (isGuest || !row) {
      showGuestPrompt();
      return;
    }
    setMsgBusy(true);
    try {
      const { conversation_id } = await apiOpenConversation({
        peer_user_id: row.buyer_user_id,
        context_type: 'general',
      });
      openInboxChat(
        navigation,
        conversation_id,
        row.buyer_label || row.buyer_name,
        row.buyer_user_id,
        row.buyer_username ?? undefined,
        row.request_type !== 'product_order'
      );
    } catch (e) {
      Alert.alert('Could not open chat', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setMsgBusy(false);
    }
  };

  const messageSeller = async () => {
    if (isGuest || !row) {
      showGuestPrompt();
      return;
    }
    setMsgBusy(true);
    try {
      let conversation_id: number;
      const st = row.subject_type;
      const sid = row.subject_id;
      if (st === 'listing') {
        ({ conversation_id } = await apiOpenConversation({
          peer_user_id: row.seller_user_id,
          context_type: 'listing',
          context_id: sid,
        }));
      } else if (st === 'product') {
        ({ conversation_id } = await apiOpenConversation({
          peer_user_id: row.seller_user_id,
          context_type: 'product',
          context_id: sid,
        }));
      } else if (st === 'directory_entry') {
        ({ conversation_id } = await apiOpenConversation({
          peer_user_id: row.seller_user_id,
          context_type: 'directory_entry',
          context_id: sid,
        }));
      } else {
        ({ conversation_id } = await apiOpenConversation({
          peer_user_id: row.seller_user_id,
          context_type: 'general',
        }));
      }
      openInboxChat(
        navigation,
        conversation_id,
        row.seller_label || 'Seller',
        row.seller_user_id,
        row.seller_username ?? undefined,
        row.request_type !== 'product_order'
      );
    } catch (e) {
      Alert.alert('Could not open chat', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setMsgBusy(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {isSeller && status === 'new' ? (
            <View style={styles.sellerHint}>
              <Text style={styles.sellerHintText}>
                Review photos and the listing or product below, then message the buyer if needed before you accept or decline.
              </Text>
            </View>
          ) : null}

          {heroUrl ? (
            <RemoteImage url={heroUrl} style={styles.heroLarge} contentFit="cover" />
          ) : (
            <View style={[styles.heroLarge, styles.heroPh]} />
          )}

          <Text style={styles.chipLine}>
            {subjectTypeLabel(row.subject_type)} · {row.request_type.replace(/_/g, ' ')} · #{row.id}
          </Text>
          <Text style={styles.title}>{headline}</Text>
          {preview?.meta_line ? <Text style={styles.subline}>{preview.meta_line}</Text> : null}
          <Text style={styles.status}>{labelForStatus(status)}</Text>

          {galleryUrls.length > 1 ? (
            <>
              <Text style={styles.section}>Photos</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
                {galleryUrls.map((url, i) => (
                  <RemoteImage key={`${url}-${i}`} url={url} style={styles.galleryThumb} contentFit="cover" />
                ))}
              </ScrollView>
            </>
          ) : null}

          {preview?.description ? (
            <>
              <Text style={styles.section}>
                {row.subject_type === 'product' ? 'Product description' : 'Listing / item description'}
              </Text>
              <Text style={styles.body}>{preview.description}</Text>
            </>
          ) : null}

          {preview?.specifications ? (
            <>
              <Text style={styles.section}>Specifications</Text>
              <Text style={styles.body}>{preview.specifications}</Text>
            </>
          ) : null}

          {showViewSubject ? (
            <PrimaryButton label={viewSubjectLabel} variant="outline" onPress={openSubject} style={styles.viewBtn} />
          ) : null}

          {row.unit_price ? (
            <Text style={styles.price}>
              Order line: {row.currency} {row.unit_price} × {row.quantity}
            </Text>
          ) : null}

          <Text style={styles.section}>People</Text>
          <Text style={styles.meta}>Buyer: {row.buyer_label || row.buyer_username || '—'}</Text>
          <Text style={styles.meta}>Seller: {row.seller_label || row.seller_username || '—'}</Text>

          {isSeller ? (
            <PrimaryButton
              label="Message buyer"
              variant="outline"
              onPress={() => void messageBuyer()}
              loading={msgBusy}
              style={styles.msgBtn}
            />
          ) : null}
          {isBuyer ? (
            <PrimaryButton
              label="Message seller"
              variant="outline"
              onPress={() => void messageSeller()}
              loading={msgBusy}
              style={styles.msgBtn}
            />
          ) : null}

          {row.tracking_number ? (
            <>
              <Text style={styles.section}>Tracking</Text>
              <Text style={styles.meta}>{row.tracking_number}</Text>
            </>
          ) : null}

          {row.shipping_address1 ? (
            <>
              <Text style={styles.section}>Shipping</Text>
              <Text style={styles.meta}>
                {[row.shipping_name, row.shipping_address1, row.shipping_address2, row.shipping_city, row.shipping_state, row.shipping_postal_code, row.shipping_country]
                  .filter(Boolean)
                  .join('\n')}
              </Text>
            </>
          ) : null}

          {row.project_brief ? (
            <>
              <Text style={styles.section}>Buyer message & notes</Text>
              <Text style={styles.body}>{row.project_brief}</Text>
            </>
          ) : null}

          {row.preferred_contact ? <Text style={styles.meta}>Preferred contact: {row.preferred_contact}</Text> : null}

          {row.seller_note ? (
            <>
              <Text style={styles.section}>Seller note</Text>
              <Text style={styles.body}>{row.seller_note}</Text>
            </>
          ) : null}

          <Text style={styles.section}>Timeline</Text>
          <Text style={styles.meta}>Created: {row.created_at}</Text>
          <Text style={styles.meta}>Updated: {row.updated_at}</Text>

          {isSeller && ['accepted', 'in_progress', 'ready'].includes(status) ? (
            <>
              <Text style={styles.section}>Tracking number</Text>
              <TextInput
                value={trackingInput}
                onChangeText={setTrackingInput}
                placeholder="Optional — saved when you mark shipped"
                style={styles.trackingField}
              />
            </>
          ) : null}

          <View style={styles.actions}>
            {isBuyer ? (
              <>
                {['new', 'accepted'].includes(status) ? (
                  <Pressable onPress={confirmCancelOrder} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Cancel</Text>
                  </Pressable>
                ) : null}
                {['shipped', 'ready', 'in_progress'].includes(status) ? (
                  <Pressable onPress={() => void action('delivered')} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Mark received</Text>
                  </Pressable>
                ) : null}
                {['delivered', 'ready'].includes(status) ? (
                  <Pressable onPress={() => void action('complete')} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Complete</Text>
                  </Pressable>
                ) : null}
                {status === 'completed' ? (
                  <Pressable onPress={() => setReviewOpen(true)} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Leave review</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {isSeller ? (
              <>
                {status === 'new' ? (
                  <>
                    <Pressable onPress={() => void action('accept')} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Accept</Text>
                    </Pressable>
                    <Pressable onPress={() => void action('decline')} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Decline</Text>
                    </Pressable>
                  </>
                ) : null}
                {['accepted', 'ready'].includes(status) ? (
                  <Pressable onPress={() => void action('in_progress')} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>In progress</Text>
                  </Pressable>
                ) : null}
                {['accepted', 'in_progress'].includes(status) ? (
                  <Pressable onPress={() => void action('ready')} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Ready</Text>
                  </Pressable>
                ) : null}
                {['accepted', 'in_progress', 'ready'].includes(status) ? (
                  <Pressable onPress={() => void action('shipped')} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>Shipped</Text>
                  </Pressable>
                ) : null}
              </>
            ) : null}

            {!['completed', 'cancelled', 'declined'].includes(status) ? (
              <Pressable onPress={() => void action('dispute')} style={[styles.smallBtn, styles.dangerBtn]}>
                <Text style={[styles.smallBtnText, styles.dangerText]}>Dispute</Text>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>

        <Modal visible={reviewOpen} transparent animationType="fade" onRequestClose={() => setReviewOpen(false)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.reviewModal}>
              <Text style={styles.reviewModalTitle}>Review {row.subject_title}</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setReviewRating(n)} hitSlop={8}>
                    <Text style={[styles.starPick, n <= reviewRating && styles.starPickOn]}>★</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput value={reviewTitle} onChangeText={setReviewTitle} placeholder="Title (optional)" style={styles.input} />
              <TextInput
                value={reviewBody}
                onChangeText={setReviewBody}
                placeholder="Tell other members how it went."
                multiline
                style={[styles.input, styles.textArea]}
              />
              <View style={styles.modalActions}>
                <Pressable onPress={() => setReviewOpen(false)} style={[styles.smallBtn, styles.mutedBtn]}>
                  <Text style={styles.mutedBtnText}>Cancel</Text>
                </Pressable>
                <PrimaryButton label="Post review" onPress={() => void submitReview()} loading={reviewBusy} style={styles.reviewSubmit} />
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scroll: { padding: 20, paddingBottom: 40 },
  err: { color: '#b91c1c', fontWeight: '700', textAlign: 'center' },
  sellerHint: {
    backgroundColor: 'rgba(31, 170, 242, 0.12)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.28)',
  },
  sellerHintText: { fontSize: 13, lineHeight: 19, fontWeight: '600', color: colors.text },
  heroLarge: {
    width: '100%',
    aspectRatio: 1.05,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    marginBottom: 12,
  },
  heroPh: { alignItems: 'center', justifyContent: 'center' },
  chipLine: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subline: { marginTop: 6, fontSize: 14, fontWeight: '600', color: colors.textMuted },
  status: { fontSize: 13, fontWeight: '800', color: colors.goldDark, marginTop: 8, textTransform: 'capitalize' },
  galleryRow: { flexDirection: 'row', gap: 10, paddingVertical: 4 },
  galleryThumb: { width: 120, height: 120, borderRadius: 14, backgroundColor: colors.primarySoft },
  viewBtn: { marginTop: 14 },
  price: { fontSize: 17, fontWeight: '800', color: colors.primaryDark, marginTop: 14 },
  msgBtn: { marginTop: 12 },
  section: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  meta: { marginTop: 6, fontSize: 14, color: colors.textMuted, fontWeight: '600', lineHeight: 20 },
  body: { marginTop: 8, fontSize: 15, color: colors.text, fontWeight: '500', lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 20 },
  smallBtn: { borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 7 },
  smallBtnText: { color: colors.primaryDark, fontSize: 12, fontWeight: '800' },
  dangerBtn: { backgroundColor: 'rgba(220, 38, 38, 0.1)' },
  dangerText: { color: colors.danger },
  mutedBtn: { backgroundColor: 'rgba(11, 18, 32, 0.06)' },
  mutedBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(11,18,32,0.48)', justifyContent: 'center', padding: 20 },
  reviewModal: { backgroundColor: colors.white, borderRadius: 22, padding: 18 },
  reviewModalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  starRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  starPick: { fontSize: 30, color: 'rgba(11,18,32,0.16)' },
  starPickOn: { color: colors.gold },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  trackingField: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  reviewSubmit: { flex: 1 },
});

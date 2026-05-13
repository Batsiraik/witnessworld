import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

type RequestRow = {
  id: number;
  subject_title: string;
  request_type: string;
  status: string;
  quantity: number;
  unit_price: string | null;
  currency: string;
  seller_label: string;
  seller_username: string | null;
  subject_type: 'product' | 'listing' | 'directory_entry' | 'member';
  subject_id: number;
  created_at: string;
  tracking_number?: string | null;
};

function labelForStatus(s: string): string {
  return s.replace(/_/g, ' ');
}

function subjectCopy(subjectType?: string): { title: string; brief: string; needsShipping: boolean } {
  if (subjectType === 'product') {
    return {
      title: 'Request this product',
      brief: 'Send your shipping details to the seller. Payment stays outside WWC for now so both sides can confirm safely first.',
      needsShipping: true,
    };
  }
  if (subjectType === 'directory_entry') {
    return {
      title: 'Request this business',
      brief: 'Tell the business what you need. Keep communication inside WWC until you are comfortable moving forward.',
      needsShipping: false,
    };
  }
  return {
    title: 'Send hire/request',
    brief: 'Tell the seller or provider what you need. WWC keeps a record so scams and disputes can be reviewed.',
    needsShipping: false,
  };
}

export function CartScreen({ navigation, route }: Props) {
  const params = route.params;
  const subjectType = params?.subjectType;
  const subjectId = params?.subjectId;
  const isRequestForm = Boolean(subjectType && subjectId);
  const copy = useMemo(() => subjectCopy(subjectType), [subjectType]);
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(!isRequestForm);
  const [submitting, setSubmitting] = useState(false);
  const [buyerName, setBuyerName] = useState(
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim()
  );
  const [buyerEmail, setBuyerEmail] = useState(user?.email ?? '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? '');
  const [quantity, setQuantity] = useState('1');
  const [brief, setBrief] = useState('');
  const [preferredContact, setPreferredContact] = useState('WWC app chat');
  const [shippingName, setShippingName] = useState(buyerName);
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [ack, setAck] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<RequestRow | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewBody, setReviewBody] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  const load = useCallback(async () => {
    if (isRequestForm) return;
    if (isGuest) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await apiGet('commerce-requests-list.php?role=buyer', true);
      setRows(Array.isArray(data.requests) ? (data.requests as RequestRow[]) : []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [isGuest, isRequestForm]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const submit = async () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (!subjectType || !subjectId) return;
    if (!buyerName.trim()) {
      Alert.alert('Name required', 'Please add your name.');
      return;
    }
    if (copy.needsShipping && (!address1.trim() || !city.trim() || !country.trim())) {
      Alert.alert('Shipping required', 'Please add your shipping address so the seller can fulfill the request.');
      return;
    }
    if (!copy.needsShipping && !brief.trim()) {
      Alert.alert('Details required', 'Please describe what you need.');
      return;
    }
    if (!ack) {
      Alert.alert('Safety reminder', 'Please confirm the anti-scam reminder before sending.');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(
        'commerce-request-create.php',
        {
          subject_type: subjectType,
          subject_id: subjectId,
          quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim(),
          project_brief: brief.trim(),
          preferred_contact: preferredContact.trim(),
          anti_scam_ack: ack,
          shipping: {
            name: shippingName.trim() || buyerName.trim(),
            address1: address1.trim(),
            address2: address2.trim(),
            city: city.trim(),
            state: state.trim(),
            postal_code: postalCode.trim(),
            country: country.trim(),
          },
        },
        true
      );
      Alert.alert('Request sent', 'The seller has been notified in the app and by email.');
      navigation.replace('Cart');
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const action = async (requestId: number, nextAction: string) => {
    try {
      await apiPost('commerce-request-action.php', { request_id: requestId, action: nextAction }, true);
      await load();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const openReview = (item: RequestRow) => {
    setReviewTarget(item);
    setReviewRating(5);
    setReviewTitle('');
    setReviewBody('');
  };

  const submitReview = async () => {
    if (!reviewTarget) return;
    if (!reviewBody.trim()) {
      Alert.alert('Review required', 'Please write a short review.');
      return;
    }
    setReviewBusy(true);
    try {
      await apiPost(
        'content-review-create.php',
        {
          request_id: reviewTarget.id,
          rating: reviewRating,
          title: reviewTitle.trim(),
          body: reviewBody.trim(),
        },
        true
      );
      Alert.alert('Review posted', 'Thanks for helping other members make safer choices.');
      setReviewTarget(null);
    } catch (e) {
      Alert.alert('Could not post review', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setReviewBusy(false);
    }
  };

  if (isRequestForm) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.box}>
              <Text style={styles.title}>{copy.title}</Text>
              <Text style={styles.body}>{copy.brief}</Text>
              <TextInput value={buyerName} onChangeText={setBuyerName} placeholder="Your name" style={styles.input} />
              <TextInput value={buyerEmail} onChangeText={setBuyerEmail} placeholder="Email" keyboardType="email-address" style={styles.input} />
              <TextInput value={buyerPhone} onChangeText={setBuyerPhone} placeholder="Phone / WhatsApp" style={styles.input} />
              {copy.needsShipping ? (
                <>
                  <TextInput value={quantity} onChangeText={setQuantity} placeholder="Quantity" keyboardType="number-pad" style={styles.input} />
                  <Text style={styles.section}>Shipping address</Text>
                  <TextInput value={shippingName} onChangeText={setShippingName} placeholder="Recipient name" style={styles.input} />
                  <TextInput value={address1} onChangeText={setAddress1} placeholder="Address line 1" style={styles.input} />
                  <TextInput value={address2} onChangeText={setAddress2} placeholder="Address line 2 (optional)" style={styles.input} />
                  <TextInput value={city} onChangeText={setCity} placeholder="City" style={styles.input} />
                  <TextInput value={state} onChangeText={setState} placeholder="State / province" style={styles.input} />
                  <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" style={styles.input} />
                  <TextInput value={country} onChangeText={setCountry} placeholder="Country" style={styles.input} />
                </>
              ) : (
                <>
                  <Text style={styles.section}>Request details</Text>
                  <TextInput
                    value={brief}
                    onChangeText={setBrief}
                    placeholder="Describe what you need, timeline, budget, pickup/meeting preference, or project details."
                    multiline
                    style={[styles.input, styles.textArea]}
                  />
                  <TextInput value={preferredContact} onChangeText={setPreferredContact} placeholder="Preferred contact" style={styles.input} />
                </>
              )}
              <Pressable onPress={() => setAck((v) => !v)} style={styles.ackRow}>
                <View style={[styles.checkbox, ack && styles.checkboxOn]} />
                <Text style={styles.ackText}>
                  I understand WWC does not hold payment in V1. I will keep communication in the app, avoid off-platform pressure, and report suspicious behavior.
                </Text>
              </Pressable>
              <PrimaryButton label="Send request" onPress={() => void submit()} loading={submitting} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : isGuest ? (
          <View style={styles.box}>
            <Text style={styles.title}>My requests</Text>
            <Text style={styles.body}>Sign in to view product orders and hire requests.</Text>
            <PrimaryButton label="Sign in or create account" onPress={showGuestPrompt} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              <View style={styles.listHead}>
                <Text style={styles.title}>My requests</Text>
                <Text style={styles.body}>Track your product orders, local meetup requests, and service hires.</Text>
              </View>
            }
            ListEmptyComponent={<Text style={styles.empty}>No requests yet. Start from a product, service, or business listing.</Text>}
            renderItem={({ item }) => (
              <View style={styles.card}>
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
                {item.tracking_number ? <Text style={styles.meta}>Tracking: {item.tracking_number}</Text> : null}
                <View style={styles.actions}>
                  {['new', 'accepted'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'cancel')} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Cancel</Text>
                    </Pressable>
                  ) : null}
                  {['shipped', 'ready', 'in_progress'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'delivered')} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Mark received</Text>
                    </Pressable>
                  ) : null}
                  {['delivered', 'ready'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'complete')} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Complete</Text>
                    </Pressable>
                  ) : null}
                  {item.status === 'completed' ? (
                    <Pressable onPress={() => openReview(item)} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>Leave review</Text>
                    </Pressable>
                  ) : null}
                  {!['completed', 'cancelled', 'declined'].includes(item.status) ? (
                    <Pressable onPress={() => void action(item.id, 'dispute')} style={[styles.smallBtn, styles.dangerBtn]}>
                      <Text style={[styles.smallBtnText, styles.dangerText]}>Dispute</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          />
        )}
        <Modal visible={reviewTarget != null} transparent animationType="fade" onRequestClose={() => setReviewTarget(null)}>
          <View style={styles.modalBackdrop}>
            <View style={styles.reviewModal}>
              <Text style={styles.reviewModalTitle}>Review {reviewTarget?.subject_title}</Text>
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
                <Pressable onPress={() => setReviewTarget(null)} style={[styles.smallBtn, styles.mutedBtn]}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 20, paddingBottom: 34 },
  box: { flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.textMuted },
  section: { marginTop: 18, marginBottom: 8, fontSize: 14, fontWeight: '800', color: colors.text },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 18 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryDark, marginTop: 2 },
  checkboxOn: { backgroundColor: colors.primaryDark },
  ackText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '600' },
  list: { padding: 18, paddingBottom: 34 },
  listHead: { marginBottom: 14 },
  empty: { marginTop: 24, textAlign: 'center', color: colors.textMuted, fontWeight: '700' },
  card: { backgroundColor: colors.white, borderRadius: 18, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.line },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  status: { fontSize: 12, fontWeight: '800', color: colors.goldDark, textTransform: 'capitalize' },
  meta: { marginTop: 6, fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
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
  modalActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  reviewSubmit: { flex: 1 },
});

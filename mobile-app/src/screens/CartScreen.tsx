import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import { useShoppingCart } from '../context/ShoppingCartContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

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

function formatMoney(amount: number, currency: string): string {
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
}

function parseAmount(amount: string | null): number {
  if (amount == null || amount === '') return 0;
  const n = Number.parseFloat(amount);
  return Number.isFinite(n) ? n : 0;
}

export function CartScreen({ navigation, route }: Props) {
  const params = route.params;
  const subjectType = params?.subjectType;
  const subjectId = params?.subjectId;
  const isRequestForm = Boolean(subjectType && subjectId);
  const copy = useMemo(() => subjectCopy(subjectType), [subjectType]);
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const { lines, subtotals, unitCount, setLineQuantity, removeLine } = useShoppingCart();
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

  const summaryLines = useMemo(() => {
    const entries = Object.entries(subtotals).filter(([, v]) => v > 0);
    if (entries.length === 0) return '—';
    return entries.map(([c, v]) => formatMoney(v, c)).join(' · ');
  }, [subtotals]);

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

  /** Deep link: single listing / directory / product request (not multi-cart). */
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

  if (isGuest) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <View style={styles.box}>
            <Text style={styles.title}>Cart</Text>
            <Text style={styles.body}>Sign in to save items and send checkout requests to sellers.</Text>
            <PrimaryButton label="Sign in or create account" onPress={showGuestPrompt} />
            <PrimaryButton label="My orders" variant="outline" onPress={() => navigation.navigate('Orders')} style={{ marginTop: 12 }} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Cart</Text>
          <Text style={styles.body}>Review what you are about to request from each store. Checkout creates one order per line.</Text>

          {lines.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.empty}>Your cart is empty.</Text>
              <PrimaryButton label="Browse online stores" onPress={() => navigation.navigate('Stores')} />
              <PrimaryButton label="My orders" variant="outline" onPress={() => navigation.navigate('Orders')} style={{ marginTop: 12 }} />
            </View>
          ) : (
            <>
              {lines.map((line) => (
                <View key={`${line.subject_type}:${line.subject_id}`} style={styles.lineCard}>
                  <View style={styles.lineRow}>
                    {line.image_url ? (
                      <RemoteImage url={line.image_url} style={styles.lineImg} contentFit="cover" />
                    ) : (
                      <View style={[styles.lineImg, styles.lineImgPh]} />
                    )}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.lineTitle} numberOfLines={2}>
                        {line.title}
                      </Text>
                      <Text style={styles.linePrice}>
                        {line.currency} {line.unit_price ?? '—'} × {line.quantity}
                      </Text>
                      <View style={styles.qtyRow}>
                        <Pressable
                          onPress={() => {
                            if (line.quantity <= 1) removeLine('product', line.subject_id);
                            else setLineQuantity('product', line.subject_id, line.quantity - 1);
                          }}
                          style={styles.qtyBtn}
                          hitSlop={6}
                        >
                          <Text style={styles.qtyBtnText}>−</Text>
                        </Pressable>
                        <Text style={styles.qtyVal}>{line.quantity}</Text>
                        <Pressable
                          onPress={() => setLineQuantity('product', line.subject_id, line.quantity + 1)}
                          style={styles.qtyBtn}
                          hitSlop={6}
                        >
                          <Text style={styles.qtyBtnText}>+</Text>
                        </Pressable>
                        <Pressable onPress={() => removeLine('product', line.subject_id)} style={styles.removeBtn} hitSlop={6}>
                          <Text style={styles.removeBtnText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Summary</Text>
                <Text style={styles.summaryLine}>
                  {unitCount} item{unitCount === 1 ? '' : 's'} in {lines.length} line{lines.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.summaryTotal}>{summaryLines}</Text>
              </View>

              <PrimaryButton label="Review shipping & checkout" onPress={() => navigation.navigate('CartCheckout')} />
              <PrimaryButton label="My orders" variant="outline" onPress={() => navigation.navigate('Orders')} style={{ marginTop: 12 }} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 40 },
  box: { flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.textMuted, marginBottom: 16 },
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
  emptyBox: { marginTop: 24 },
  empty: { textAlign: 'center', color: colors.textMuted, fontWeight: '700', marginBottom: 20 },
  lineCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.line,
  },
  lineRow: { flexDirection: 'row', gap: 12 },
  lineImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: colors.primarySoft },
  lineImgPh: { backgroundColor: colors.line },
  lineTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  linePrice: { marginTop: 4, fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 20, fontWeight: '800', color: colors.primaryDark, marginTop: -2 },
  qtyVal: { fontSize: 16, fontWeight: '800', color: colors.text, minWidth: 28, textAlign: 'center' },
  removeBtn: { marginLeft: 'auto' },
  removeBtnText: { fontSize: 13, fontWeight: '800', color: colors.danger },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  summaryTitle: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: 8 },
  summaryLine: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  summaryTotal: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginTop: 8 },
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import { useShoppingCart } from '../context/ShoppingCartContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'CartCheckout'>;

export function CartCheckoutScreen({ navigation }: Props) {
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const { lines, clearCart } = useShoppingCart();
  const [submitting, setSubmitting] = useState(false);
  const [buyerName, setBuyerName] = useState([user?.first_name, user?.last_name].filter(Boolean).join(' ').trim());
  const [buyerEmail, setBuyerEmail] = useState(user?.email ?? '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? '');
  const [orderNote, setOrderNote] = useState('');
  const [shippingName, setShippingName] = useState(buyerName);
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [ack, setAck] = useState(false);

  const summaryText = useMemo(() => {
    const parts = lines.map((l) => `${l.title} × ${l.quantity}`);
    return parts.join('\n');
  }, [lines]);

  const submit = async () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (lines.length === 0) {
      Alert.alert('Cart empty', 'Add products before checking out.');
      navigation.goBack();
      return;
    }
    if (!buyerName.trim()) {
      Alert.alert('Name required', 'Please add your name.');
      return;
    }
    if (!address1.trim() || !city.trim() || !country.trim()) {
      Alert.alert('Shipping required', 'Please add your full shipping address.');
      return;
    }
    if (!ack) {
      Alert.alert('Safety reminder', 'Please confirm the anti-scam reminder before sending.');
      return;
    }
    setSubmitting(true);
    const brief = [orderNote.trim(), summaryText ? `Order summary:\n${summaryText}` : ''].filter(Boolean).join('\n\n');
    try {
      for (const line of lines) {
        await apiPost(
          'commerce-request-create.php',
          {
            subject_type: 'product',
            subject_id: line.subject_id,
            quantity: line.quantity,
            buyer_name: buyerName.trim(),
            buyer_email: buyerEmail.trim(),
            buyer_phone: buyerPhone.trim(),
            project_brief: brief,
            preferred_contact: 'WWC app chat',
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
      }
      clearCart();
      Alert.alert('Requests sent', 'Each seller has been notified. Track status under My orders.', [
        {
          text: 'OK',
          onPress: () => navigation.replace('Orders'),
        },
      ]);
    } catch (e) {
      Alert.alert('Could not complete checkout', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.box}>
            <Text style={styles.title}>Checkout</Text>
            <Text style={styles.body}>
              We create one order per product line so each store owner can fulfill and update status separately.
            </Text>
            <Text style={styles.section}>Contact</Text>
            <TextInput value={buyerName} onChangeText={setBuyerName} placeholder="Your name" style={styles.input} />
            <TextInput value={buyerEmail} onChangeText={setBuyerEmail} placeholder="Email" keyboardType="email-address" style={styles.input} />
            <TextInput value={buyerPhone} onChangeText={setBuyerPhone} placeholder="Phone / WhatsApp" style={styles.input} />
            <Text style={styles.section}>Shipping address</Text>
            <TextInput value={shippingName} onChangeText={setShippingName} placeholder="Recipient name" style={styles.input} />
            <TextInput value={address1} onChangeText={setAddress1} placeholder="Address line 1" style={styles.input} />
            <TextInput value={address2} onChangeText={setAddress2} placeholder="Address line 2 (optional)" style={styles.input} />
            <TextInput value={city} onChangeText={setCity} placeholder="City" style={styles.input} />
            <TextInput value={state} onChangeText={setState} placeholder="State / province" style={styles.input} />
            <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="Postal code" style={styles.input} />
            <TextInput value={country} onChangeText={setCountry} placeholder="Country" style={styles.input} />
            <Text style={styles.section}>Note to sellers (optional)</Text>
            <TextInput
              value={orderNote}
              onChangeText={setOrderNote}
              placeholder="Delivery instructions or questions for the shop."
              multiline
              style={[styles.input, styles.textArea]}
            />
            <Pressable onPress={() => setAck((v) => !v)} style={styles.ackRow}>
              <View style={[styles.checkbox, ack && styles.checkboxOn]} />
              <Text style={styles.ackText}>
                I understand WWC does not hold payment in V1. I will keep communication in the app, avoid off-platform pressure, and report suspicious behavior.
              </Text>
            </Pressable>
            <PrimaryButton label="Place orders" onPress={() => void submit()} loading={submitting} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 34 },
  box: { paddingBottom: 24 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 10 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '600', color: colors.textMuted, marginBottom: 16 },
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
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 18 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryDark, marginTop: 2 },
  checkboxOn: { backgroundColor: colors.primaryDark },
  ackText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '600' },
});

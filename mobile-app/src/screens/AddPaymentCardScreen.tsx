import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CardField,
  type CardFieldInput,
  SetupIntent,
  StripeProvider,
  useConfirmSetupIntent,
} from '@stripe/stripe-react-native';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const STRIPE_URL_SCHEME = 'witnessworldconnect';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPaymentCard'>;

function readUseDemoCardCapture(): boolean {
  const extra = Constants.expoConfig?.extra as { useDemoCardCapture?: boolean | string } | undefined;
  const v = extra?.useDemoCardCapture;
  return v === true || v === 'true';
}

function onlyDigits(s: string): string {
  return s.replace(/\D/g, '');
}

function parseExpiryMmYy(s: string): { month: number; year: number } | null {
  const t = s.trim().replace(/\s/g, '');
  const m = /^(\d{2})\/(\d{2})$/.exec(t);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (month < 1 || month > 12) return null;
  return { month, year: 2000 + yy };
}

function expiryIsFuture(month: number, year: number): boolean {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth() + 1;
  return year > y || (year === y && month >= mo);
}

/** QA / Android-safe path: no native CardField; server attaches Stripe test Visa when demo is enabled. */
function DemoAddPaymentCardScreen({ navigation, route }: Props) {
  const returnTo = route.params?.returnTo ?? 'pop';
  const email = route.params?.email ?? '';
  const signupFlow = returnTo === 'register_complete';

  const [pan, setPan] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12 / 34');
  const [cvc, setCvc] = useState('123');
  const [saving, setSaving] = useState(false);
  const [skipBusy, setSkipBusy] = useState(false);

  const finishSuccess = useCallback(() => {
    if (returnTo === 'register_complete') {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  }, [navigation, returnTo]);

  const onBack = () => {
    if (returnTo === 'register_complete') {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  };

  const confirmSkipToFree = () => {
    Alert.alert(
      'Use free plan instead?',
      'Your membership will switch to Free ($0/month). You will not add a card now. You can upgrade again anytime from Profile → Membership.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch to Free', style: 'destructive', onPress: () => void skipToFree() },
      ]
    );
  };

  const skipToFree = async () => {
    setSkipBusy(true);
    try {
      await apiPost('membership-change.php', { membership_plan: 'free' }, true);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      Alert.alert('Could not update plan', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSkipBusy(false);
    }
  };

  const save = async () => {
    const digits = onlyDigits(pan);
    if (digits !== '4242424242424242') {
      Alert.alert('Card', 'For this test build use card number 4242 4242 4242 4242.');
      return;
    }
    const exp = parseExpiryMmYy(expiry.replace(/\s/g, ''));
    if (!exp || !expiryIsFuture(exp.month, exp.year)) {
      Alert.alert('Card', 'Enter a valid future expiry as MM/YY (e.g. 12/34).');
      return;
    }
    const c = onlyDigits(cvc);
    if (c.length < 3) {
      Alert.alert('Card', 'Enter a 3-digit CVC.');
      return;
    }
    setSaving(true);
    try {
      await apiPost('stripe-demo-attach-test-card.php', {}, true);
      Alert.alert('Saved', 'Your test payment method is on file.', [{ text: 'OK', onPress: finishSuccess }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not save.';
      Alert.alert(
        'Card',
        msg +
          '\n\nAsk the server admin to set WW_STRIPE_DEMO_ATTACH to true in api/config.local.php (Stripe must use sk_test_…).'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Add payment method" onBack={onBack} />
        {signupFlow ? (
          <View style={styles.signupBanner}>
            <Text style={styles.signupBannerText}>
              Test build: card details are checked in the app only; the server attaches Stripe's standard test Visa
              (4242…). No native card field — avoids crashes on some devices.
            </Text>
            <PrimaryButton
              label={skipBusy ? 'Updating…' : 'Skip — use free plan'}
              variant="outline"
              onPress={confirmSkipToFree}
              disabled={skipBusy}
              style={styles.skipBtn}
            />
          </View>
        ) : null}
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>
            Enter the usual Stripe test numbers below, then tap Save. Nothing is sent to Witness World except a
            request to attach Stripe's test card on your account (same outcome as the real in-app form when demo mode
            is on).
          </Text>
          <Text style={styles.label}>Card number</Text>
          <TextInput
            value={pan}
            onChangeText={setPan}
            keyboardType="number-pad"
            placeholder="4242 4242 4242 4242"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <Text style={styles.label}>Expiry (MM/YY)</Text>
          <TextInput
            value={expiry}
            onChangeText={setExpiry}
            keyboardType="numbers-and-punctuation"
            placeholder="12/34"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCorrect={false}
          />
          <Text style={styles.label}>CVC</Text>
          <TextInput
            value={cvc}
            onChangeText={setCvc}
            keyboardType="number-pad"
            placeholder="123"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            maxLength={4}
            secureTextEntry
            autoCorrect={false}
          />
          <PrimaryButton label={saving ? 'Saving…' : 'Save card'} onPress={() => void save()} loading={saving} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

type InnerProps = {
  clientSecret: string;
  email: string;
  returnTo: 'register_complete' | 'pop';
  navigation: Props['navigation'];
};

function AddPaymentCardForm({ clientSecret, email, returnTo, navigation }: InnerProps) {
  const { confirmSetupIntent, loading: confirming } = useConfirmSetupIntent();
  const [cardComplete, setCardComplete] = useState(false);
  const [saving, setSaving] = useState(false);

  const onCardChange = useCallback((card: CardFieldInput.Details) => {
    setCardComplete(Boolean(card.complete));
  }, []);

  const finishSuccess = useCallback(() => {
    if (returnTo === 'register_complete') {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      return;
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    }
  }, [navigation, returnTo]);

  const save = useCallback(async () => {
    if (!cardComplete) {
      Alert.alert('Card', 'Please enter your full card number, expiry, and CVC.');
      return;
    }
    setSaving(true);
    try {
      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: email.trim() ? { email: email.trim() } : undefined,
        },
      });
      if (error) {
        Alert.alert('Card', error.message ?? 'Could not save card.');
        return;
      }
      if (!setupIntent || setupIntent.status !== SetupIntent.Status.Succeeded) {
        Alert.alert('Card', 'Setup was not completed. Check the details and try again.');
        return;
      }
      await apiPost('stripe-setup-intent-finalize.php', { setup_intent_id: setupIntent.id }, true);
      Alert.alert('Saved', 'Your payment method is on file.', [{ text: 'OK', onPress: finishSuccess }]);
    } catch (e) {
      Alert.alert('Card', e instanceof Error ? e.message : 'Could not finalize. Try again.');
    } finally {
      setSaving(false);
    }
  }, [cardComplete, clientSecret, confirmSetupIntent, email, finishSuccess]);

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Text style={styles.lead}>
        Card details are processed by Stripe inside this screen — they are not sent to our servers. Use test card
        4242 4242 4242 4242 with any future expiry and any CVC while your project uses Stripe test keys.
      </Text>
      <CardField
        postalCodeEnabled={false}
        cardStyle={{
          backgroundColor: colors.white,
          textColor: colors.text,
          placeholderColor: colors.textMuted,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: 12,
        }}
        style={styles.cardField}
        onCardChange={onCardChange}
      />
      <PrimaryButton
        label={saving || confirming ? 'Saving…' : 'Save card'}
        onPress={() => void save()}
        loading={saving || confirming}
        disabled={!cardComplete}
      />
    </ScrollView>
  );
}

export function AddPaymentCardScreen({ navigation, route }: Props) {
  if (readUseDemoCardCapture()) {
    return <DemoAddPaymentCardScreen navigation={navigation} route={route} />;
  }

  const returnTo = route.params?.returnTo ?? 'pop';
  const email = route.params?.email ?? '';
  const signupFlow = returnTo === 'register_complete';

  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [publishableKey, setPublishableKey] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loadError, setLoadError] = useState('');
  const [skipBusy, setSkipBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await apiPost('stripe-setup-intent-create.php', {}, true);
        const pk = typeof d.publishable_key === 'string' ? d.publishable_key : '';
        const cs = typeof d.client_secret === 'string' ? d.client_secret : '';
        if (!pk || !cs) throw new Error('Billing is not configured correctly on the server.');
        if (cancelled) return;
        setPublishableKey(pk);
        setClientSecret(cs);
        setPhase('ready');
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not start billing.');
          setPhase('error');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onBack = () => {
    if (returnTo === 'register_complete') {
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
      return;
    }
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
  };

  const confirmSkipToFree = () => {
    Alert.alert(
      'Use free plan instead?',
      'Your membership will switch to Free ($0/month). You will not add a card now. You can upgrade again anytime from Profile → Membership.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch to Free', style: 'destructive', onPress: () => void skipToFree() },
      ]
    );
  };

  const skipToFree = async () => {
    setSkipBusy(true);
    try {
      await apiPost('membership-change.php', { membership_plan: 'free' }, true);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      Alert.alert('Could not update plan', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSkipBusy(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Add payment method" onBack={onBack} />
        {signupFlow ? (
          <View style={styles.signupBanner}>
            <Text style={styles.signupBannerText}>
              Your trial is active. Add a test card (4242 4242 4242 4242, any future expiry, any CVC) or switch to
              Free below — you are not charged until after the trial if you stay on a paid plan with a card on file.
            </Text>
            <PrimaryButton
              label={skipBusy ? 'Updating…' : 'Skip — use free plan'}
              variant="outline"
              onPress={confirmSkipToFree}
              disabled={skipBusy}
              style={styles.skipBtn}
            />
          </View>
        ) : null}
        {phase === 'loading' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.muted}>Preparing secure card form…</Text>
          </View>
        ) : null}
        {phase === 'error' ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{loadError}</Text>
            <PrimaryButton label="Close" onPress={onBack} style={styles.closeBtn} />
            {signupFlow ? (
              <PrimaryButton
                label={skipBusy ? 'Updating…' : 'Skip — use free plan'}
                variant="outline"
                onPress={confirmSkipToFree}
                disabled={skipBusy}
                style={styles.skipBtn}
              />
            ) : null}
          </View>
        ) : null}
        {phase === 'ready' && publishableKey && clientSecret ? (
          <StripeProvider
            publishableKey={publishableKey}
            urlScheme={STRIPE_URL_SCHEME}
            setReturnUrlSchemeOnAndroid
          >
            <AddPaymentCardForm
              clientSecret={clientSecret}
              email={email}
              returnTo={returnTo}
              navigation={navigation}
            />
          </StripeProvider>
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center' },
  errorText: { color: colors.danger, textAlign: 'center', fontWeight: '700', marginBottom: 16 },
  closeBtn: { marginTop: 8 },
  signupBanner: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 18, 32, 0.12)',
  },
  signupBannerText: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 10,
  },
  skipBtn: { marginTop: 4 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32 },
  lead: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    marginBottom: 16,
  },
  cardField: { width: '100%', minHeight: 56, height: 200, marginBottom: 20 },
});

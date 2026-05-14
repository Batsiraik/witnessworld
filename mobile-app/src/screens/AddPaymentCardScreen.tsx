import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
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
  cardField: { width: '100%', minHeight: 56, height: 200, marginBottom: 20 },
});

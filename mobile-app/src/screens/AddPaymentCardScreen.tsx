import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Linking,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { apiGet, apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPaymentCard'>;

type Phase = 'ready' | 'loading' | 'waiting' | 'error';

function parseStripeSetupDeepLink(url: string): 'success' | 'cancel' | null {
  const u = url.toLowerCase();
  if (u.includes('stripe-setup/success') || u.includes('stripe-setup%2fsuccess')) {
    return 'success';
  }
  if (u.includes('stripe-setup/cancel') || u.includes('stripe-setup%2fcancel')) {
    return 'cancel';
  }
  return null;
}

export function AddPaymentCardScreen({ navigation, route }: Props) {
  const returnTo = route.params?.returnTo ?? 'pop';
  const signupFlow = returnTo === 'register_complete';

  const [phase, setPhase] = useState<Phase>('ready');
  const [loadError, setLoadError] = useState('');
  const [skipBusy, setSkipBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const completedRef = useRef(false);
  const waitingRef = useRef(false);

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

  const handleSuccess = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    waitingRef.current = false;
    setPhase('ready');
    Alert.alert('Saved', 'Your payment method is on file.', [{ text: 'OK', onPress: finishSuccess }]);
  }, [finishSuccess]);

  const handleCancel = useCallback(() => {
    waitingRef.current = false;
    setPhase('ready');
    if (signupFlow) {
      Alert.alert(
        'Checkout cancelled',
        'You can open Stripe again to add a card, or switch to the free plan.',
        [{ text: 'OK' }]
      );
    }
  }, [signupFlow]);

  const handleDeepLink = useCallback(
    (url: string | null) => {
      if (!url || !waitingRef.current) return;
      const kind = parseStripeSetupDeepLink(url);
      if (kind === 'success') handleSuccess();
      else if (kind === 'cancel') handleCancel();
    },
    [handleCancel, handleSuccess]
  );

  useEffect(() => {
    const sub = Linking.addEventListener('url', (ev) => {
      handleDeepLink(ev.url);
    });
    void Linking.getInitialURL().then(handleDeepLink);
    return () => sub.remove();
  }, [handleDeepLink]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !waitingRef.current || completedRef.current) return;
      void (async () => {
        try {
          const data = await apiGet('membership-status.php', true);
          const subPayload = data.subscription as { stripe_payment_method_status?: string } | undefined;
          if (String(subPayload?.stripe_payment_method_status ?? '').toLowerCase() === 'attached') {
            handleSuccess();
          }
        } catch {
          /* user may still be in browser */
        }
      })();
    });
    return () => sub.remove();
  }, [handleSuccess]);

  const fetchCheckoutUrl = useCallback(async (): Promise<string> => {
    const d = await apiPost('stripe-card-embed-init.php', {}, true);
    const url = typeof d.url === 'string' ? d.url : '';
    if (!url) throw new Error('No checkout URL from server.');
    return url;
  }, []);

  const openStripeCheckout = useCallback(async () => {
    setLoadError('');
    setPhase('loading');
    try {
      const url = checkoutUrl ?? (await fetchCheckoutUrl());
      setCheckoutUrl(url);
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        throw new Error('Cannot open the browser on this device.');
      }
      await Linking.openURL(url);
      waitingRef.current = true;
      completedRef.current = false;
      setPhase('waiting');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not open Stripe checkout.');
      setPhase('error');
    }
  }, [checkoutUrl, fetchCheckoutUrl]);

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

        <View style={styles.body}>
          <Text style={styles.lead}>
            Stripe opens in your browser (Chrome or Safari). You can pay with card, Link, Cash App, and other methods
            enabled on your Stripe account. When you finish, you will return to this app automatically.
          </Text>

          {signupFlow ? (
            <View style={styles.signupBox}>
              <Text style={styles.signupHint}>
                Add a card now, or skip to use the free plan ($0/month). You can upgrade later from Profile →
                Membership.
              </Text>
              <PrimaryButton
                label={skipBusy ? 'Updating…' : 'Skip — use free plan'}
                variant="outline"
                onPress={confirmSkipToFree}
                disabled={skipBusy || phase === 'loading'}
                style={styles.skipBtn}
              />
            </View>
          ) : null}

          {phase === 'loading' ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.muted}>Opening Stripe…</Text>
            </View>
          ) : null}

          {phase === 'waiting' ? (
            <View style={styles.centerBlock}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.muted}>Complete checkout in your browser, then return here.</Text>
              <Text style={styles.mutedSmall}>
                If the app does not open by itself, switch back to Witness World Connect.
              </Text>
              <PrimaryButton
                label="Open Stripe again"
                onPress={() => void openStripeCheckout()}
                style={styles.actionBtn}
              />
            </View>
          ) : null}

          {phase === 'error' ? (
            <View style={styles.centerBlock}>
              <Text style={styles.errorText}>{loadError}</Text>
              <PrimaryButton label="Try again" onPress={() => void openStripeCheckout()} style={styles.actionBtn} />
            </View>
          ) : null}

          {phase === 'ready' ? (
            <PrimaryButton
              label="Continue in browser (Stripe)"
              onPress={() => void openStripeCheckout()}
              style={styles.actionBtn}
            />
          ) : null}

          {phase === 'ready' || phase === 'error' ? (
            <PrimaryButton label="Close" onPress={onBack} variant="outline" style={styles.closeBtn} />
          ) : null}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  lead: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 20,
  },
  signupBox: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 18, 32, 0.12)',
  },
  signupHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 12,
  },
  skipBtn: { marginTop: 4 },
  centerBlock: { alignItems: 'center', paddingVertical: 24 },
  muted: {
    marginTop: 12,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 320,
  },
  mutedSmall: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 300,
  },
  errorText: { color: colors.danger, textAlign: 'center', fontWeight: '700', marginBottom: 8 },
  actionBtn: { marginTop: 8 },
  closeBtn: { marginTop: 12 },
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'AddPaymentCard'>;

type Phase = 'loading' | 'embed' | 'error' | 'post_cancel' | 'finished';

export function AddPaymentCardScreen({ navigation, route }: Props) {
  const returnTo = route.params?.returnTo ?? 'pop';
  const signupFlow = returnTo === 'register_complete';

  const [phase, setPhase] = useState<Phase>('loading');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [skipBusy, setSkipBusy] = useState(false);
  const [showWeb, setShowWeb] = useState(false);
  const [wvBusy, setWvBusy] = useState(true);
  const completedRef = useRef(false);

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

  /** Hide WebView first, wait for native teardown, then alert + navigate — avoids rare Android WebView/GPU crashes when stacking Alert on a live WebView. */
  const promptSaveSuccess = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setShowWeb(false);
    setEmbedUrl(null);
    setPhase('finished');
    setTimeout(() => {
      Alert.alert('Saved', 'Your payment method is on file.', [
        {
          text: 'OK',
          onPress: () => {
            InteractionManager.runAfterInteractions(() => {
              setTimeout(() => finishSuccess(), 120);
            });
          },
        },
      ]);
    }, Platform.OS === 'android' ? 600 : 450);
  }, [finishSuccess]);

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

  const handleWebMessage = useCallback(
    (raw: string) => {
      try {
        const j = JSON.parse(raw) as {
          type?: string;
          ww?: string;
          ok?: boolean;
          message?: string;
        };
        if (j.type === 'payment_success' || j.type === 'ww_stripe_card_saved') {
          promptSaveSuccess();
          return;
        }
        if (j.type === 'payment_cancelled') {
          setShowWeb(false);
          setEmbedUrl(null);
          completedRef.current = false;
          setPhase('post_cancel');
          return;
        }
        if (j.type === 'payment_error') {
          const msg = typeof j.message === 'string' && j.message.trim() ? j.message : 'Could not save card.';
          Alert.alert('Card', msg);
          return;
        }
        if (j.ww === 'stripe_setup') {
          if (j.ok === true) promptSaveSuccess();
          else {
            setShowWeb(false);
            setEmbedUrl(null);
            completedRef.current = false;
            setPhase('post_cancel');
          }
        }
      } catch {
        /* non-JSON messages ignored */
      }
    },
    [promptSaveSuccess]
  );

  const startEmbed = useCallback(async () => {
    setLoadError('');
    setPhase('loading');
    setEmbedUrl(null);
    setShowWeb(false);
    setWvBusy(true);
    completedRef.current = false;
    try {
      const d = await apiPost('stripe-card-embed-init.php', {}, true);
      const url = typeof d.url === 'string' ? d.url : '';
      if (!url) throw new Error('No card form URL from server.');
      setEmbedUrl(url);
      setPhase('embed');
      setShowWeb(true);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not start card setup.');
      setPhase('error');
    }
  }, []);

  useEffect(() => {
    void startEmbed();
  }, [startEmbed]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Add payment method" onBack={onBack} />
        {signupFlow ? (
          <View style={styles.signupBanner}>
            <Text style={styles.signupBannerText}>
              Stripe’s secure checkout opens below (hosted by Stripe). Use test card 4242 4242 4242 4242 with any future
              expiry and any CVC when the server uses Stripe test keys. Or switch to Free.
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
            <Text style={styles.muted}>Loading secure card form…</Text>
          </View>
        ) : null}

        {phase === 'error' ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{loadError}</Text>
            <PrimaryButton label="Try again" onPress={() => void startEmbed()} style={styles.closeBtn} />
            <PrimaryButton label="Close" onPress={onBack} variant="outline" style={styles.skipBtn} />
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

        {phase === 'finished' ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : null}

        {phase === 'post_cancel' && !showWeb ? (
          <View style={styles.center}>
            <Text style={styles.muted}>Card setup was cancelled or the window was closed.</Text>
            <PrimaryButton label="Open card form again" onPress={() => void startEmbed()} style={styles.closeBtn} />
            <PrimaryButton label="Close" onPress={onBack} variant="outline" style={styles.skipBtn} />
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

        {phase === 'embed' && embedUrl && showWeb ? (
          <View style={styles.webWrap}>
            {wvBusy ? (
              <View style={styles.wvOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : null}
            <WebView
              key={embedUrl}
              source={{ uri: embedUrl }}
              style={styles.webview}
              onLoadStart={() => setWvBusy(true)}
              onLoadEnd={() => setWvBusy(false)}
              onMessage={(ev) => handleWebMessage(ev.nativeEvent.data)}
              javaScriptEnabled
              domStorageEnabled
              originWhitelist={['*']}
              setSupportMultipleWindows={false}
              sharedCookiesEnabled
              thirdPartyCookiesEnabled
              {...(Platform.OS === 'android' ? { androidLayerType: 'software' as const } : {})}
            />
          </View>
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 12, color: colors.textMuted, fontWeight: '600', textAlign: 'center', maxWidth: 320 },
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
  webWrap: { flex: 1, position: 'relative' },
  webview: { flex: 1, backgroundColor: colors.white },
  wvOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 2,
  },
});

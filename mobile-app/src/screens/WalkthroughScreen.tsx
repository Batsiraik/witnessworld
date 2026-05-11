import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import {
  BackHandler,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { setWalkthroughComplete } from '../utils/walkthroughStorage';

const LOGO = require('../../assets/logo.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'Walkthrough'>;

const STEPS = 4;

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  tint: string;
  title: string;
  body: string;
}[] = [
  {
    icon: 'bag-handle-outline',
    iconColor: '#1D4ED8',
    tint: '#E8F4FD',
    title: 'Local Marketplace',
    body: 'The go-to spot for quick community commerce. Buy, sell, or trade items locally with ease and confidence.',
  },
  {
    icon: 'briefcase-outline',
    iconColor: '#7C3AED',
    tint: '#F3E8FF',
    title: 'Business Connect',
    body: 'Get your brand noticed. Create a professional listing to showcase your company and network with a dedicated audience.',
  },
  {
    icon: 'globe-outline',
    iconColor: '#0D9488',
    tint: '#CCFBF1',
    title: 'Global & Local Services',
    body: 'Hire skilled professionals for your next project. Browse and purchase digital or on-site services directly through the app.',
  },
  {
    icon: 'storefront-outline',
    iconColor: '#C2410C',
    tint: '#FFEDD5',
    title: 'Your Storefront',
    body: 'Launch your own digital shop. A dedicated space to list your full product line, manage inventory, and grow your brand like a pro.',
  },
];

export function WalkthroughScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const pageWidth = width - 24 * 2;

  const goToStep = useCallback(
    (nextStep: number) => {
      const clamped = Math.max(0, Math.min(STEPS - 1, nextStep));
      setStep(clamped);
      scrollRef.current?.scrollTo({ x: clamped * pageWidth, animated: true });
    },
    [pageWidth]
  );

  const onMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const nextStep = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      setStep(Math.max(0, Math.min(STEPS - 1, nextStep)));
    },
    [pageWidth]
  );

  /** Root stack may be only Walkthrough — Android back would dispatch GO_BACK with nowhere to go. */
  useFocusEffect(
    useCallback(() => {
      const onHardwareBack = () => {
        if (step > 0) {
          goToStep(step - 1);
        }
        /* Always consume: root stack is only Walkthrough — default GO_BACK has nowhere to go. */
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [goToStep, step])
  );

  const goAuth = useCallback(
    async (route: 'Register' | 'Login') => {
      await setWalkthroughComplete();
      /** Seed Welcome under auth so header back / hardware back has a parent (avoids empty-stack GO_BACK). */
      navigation.dispatch(
        CommonActions.reset({
          index: 1,
          routes: [{ name: 'Welcome' }, { name: route }],
        })
      );
    },
    [navigation]
  );

  const cellW = (width - 24 * 2 - 12) / 2;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable
              onPress={() => goToStep(step - 1)}
              style={({ pressed }) => [styles.backHit, pressed && styles.pressed]}
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <View style={styles.dots}>
            {Array.from({ length: STEPS }, (_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
            ))}
          </View>
          <View style={styles.backPlaceholder} />
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          horizontal
          pagingEnabled
          bounces={false}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onMomentumScrollEnd}
          keyboardShouldPersistTaps="handled"
        >
          <ScrollView
            style={[styles.page, { width: pageWidth }]}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <View style={styles.logoWrap}>
                <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="WWC logo" />
              </View>
              <Text style={styles.heroHeadline}>Welcome to Witness World Connect</Text>
              <Text style={styles.heroBody}>
                A dedicated space to connect with friends all over, share opportunities, and explore services safely within
                our community.
              </Text>
            </View>
          </ScrollView>

          <ScrollView
            style={[styles.page, { width: pageWidth }]}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.featuresSection}>
              <Text style={styles.sectionLead}>What&apos;s inside</Text>
              <Text style={styles.sectionHint}>Four ways to use WWC — marketplace, business, services, and your store.</Text>
              <View style={styles.featureGrid}>
                {FEATURES.map((f) => (
                  <View key={f.title} style={[styles.featureCell, { width: cellW }]}>
                    <View style={[styles.featureIconWrap, { backgroundColor: f.tint }]}>
                      <Ionicons name={f.icon} size={28} color={f.iconColor} />
                    </View>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureBody}>{f.body}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <ScrollView
            style={[styles.page, { width: pageWidth }]}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.trustSection}>
              <Text style={styles.sectionLead}>Community safety</Text>
              <View style={styles.trustBox}>
                <Ionicons name="shield-checkmark-outline" size={28} color={colors.primaryDark} style={styles.trustIcon} />
                <Text style={styles.trustText}>
                  Note: To keep our community safe, all new members must complete a New User Verification Form. Once your
                  profile is reviewed and approved, you&apos;ll gain full access to listings and ads.
                </Text>
              </View>
            </View>
          </ScrollView>

          <ScrollView
            style={[styles.page, { width: pageWidth }]}
            contentContainerStyle={styles.pageContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.ctaSection}>
              <Text style={styles.ctaHeadline}>You&apos;re all set</Text>
              <Text style={styles.ctaSub}>
                Create an account to start verification, or log in if you already have one.
              </Text>
            </View>
          </ScrollView>
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <PrimaryButton label="Next" onPress={() => goToStep(step + 1)} />
          ) : (
            <>
              <PrimaryButton label="Create account" onPress={() => void goAuth('Register')} />
              <View style={styles.footerGap} />
              <PrimaryButton label="Log in" variant="outline" onPress={() => void goAuth('Login')} />
            </>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backHit: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -8,
  },
  backPlaceholder: { width: 44, height: 44 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(11, 18, 32, 0.15)',
  },
  dotOn: { backgroundColor: colors.primary, width: 22 },
  scroll: { flex: 1 },
  page: { flex: 1 },
  pageContent: { paddingBottom: 16, flexGrow: 1 },
  hero: { alignItems: 'center', paddingTop: 8 },
  logoWrap: {
    width: 100,
    height: 100,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 24,
  },
  logo: { width: 80, height: 80, borderRadius: 22 },
  heroHeadline: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  heroBody: {
    fontSize: 16,
    lineHeight: 24,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 340,
  },
  featuresSection: { paddingTop: 4 },
  sectionLead: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionHint: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: '500',
    paddingHorizontal: 8,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 18,
  },
  featureCell: {
    marginBottom: 4,
  },
  featureIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '500',
  },
  trustSection: { paddingTop: 12, alignItems: 'center' },
  trustBox: {
    marginTop: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(90, 95, 225, 0.25)',
    maxWidth: 360,
    shadowColor: '#5A5FE1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  trustIcon: { alignSelf: 'center', marginBottom: 12 },
  trustText: {
    fontSize: 15,
    lineHeight: 23,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaSection: { paddingTop: 32, alignItems: 'center', paddingHorizontal: 8 },
  ctaHeadline: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  ctaSub: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 320,
  },
  footer: { paddingTop: 8, paddingBottom: 8 },
  footerGap: { height: 14 },
  pressed: { opacity: 0.85 },
});

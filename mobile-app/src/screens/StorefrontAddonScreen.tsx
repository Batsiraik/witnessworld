import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'StorefrontAddon'>;

const SMALL_FEATURES = [
  'Sell up to 25 products',
  'Custom storefront page',
  'Product listings with images',
  'Inquiry-based ordering',
  'Basic setup support',
];

const LARGE_FEATURES = [
  'Sell up to 50 products',
  'Advanced storefront layout',
  'Product categories',
  'Priority storefront placement',
  'Monthly store highlight',
  'Basic analytics',
];

export function StorefrontAddonScreen({ navigation }: Props) {
  const { subscription, refreshProfile } = useDashboardContext();
  const [busy, setBusy] = useState<string | null>(null);

  const hasBusiness = subscription?.has_business_membership === true;
  const current = subscription?.storefront_addon ?? 'none';
  const trialEnd = subscription?.trial_ends_at ? String(subscription.trial_ends_at).slice(0, 10) : null;
  const planPrice = useMemo(() => {
    const plans = subscription?.plans as Array<{ key?: string; price?: number }> | undefined;
    const p = subscription?.plan;
    const row = plans?.find((x) => x.key === p);
    return typeof row?.price === 'number' ? row.price : 0;
  }, [subscription]);

  const selectAddon = async (addon: 'none' | 'small' | 'large') => {
    setBusy(addon);
    try {
      await apiPost('storefront-addon-change.php', { storefront_addon: addon }, true);
      await refreshProfile();
      if (addon === 'none') {
        Alert.alert('Updated', 'Storefront add-on removed.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert(
          'Add-on saved',
          'Billing for this add-on is scheduled with your membership: charges apply after your trial where applicable, on top of your base plan.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(null);
    }
  };

  const confirmSelect = (addon: 'small' | 'large', label: string, price: number) => {
    Alert.alert(
      `Choose ${label}?`,
      `+$${price}/month on top of your current plan${planPrice > 0 ? ` ($${planPrice}/mo base)` : ''}. Same trial window as your membership${trialEnd ? ` (trial ends ${trialEnd})` : ''}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void selectAddon(addon) },
      ]
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Storefront add-ons</Text>
          <Text style={styles.lead}>
            Optional — separate from marketplace ads. Requires Starter, Growth, or Elite. Billed after your trial together with your plan.
          </Text>

          {!hasBusiness ? (
            <View style={styles.warn}>
              <Text style={styles.warnText}>Upgrade to a Business plan to enable storefront add-ons.</Text>
              <Pressable onPress={() => navigation.navigate('MembershipPlans')} style={styles.warnBtn}>
                <Text style={styles.warnBtnText}>View plans</Text>
              </Pressable>
            </View>
          ) : null}

          <Text style={styles.section}>Small storefront — $25/mo</Text>
          {SMALL_FEATURES.map((t) => (
            <Text key={t} style={styles.bullet}>
              • {t}
            </Text>
          ))}
          <Pressable
            disabled={!hasBusiness || busy != null}
            onPress={() => confirmSelect('small', 'Small Storefront', 25)}
            style={[styles.cta, current === 'small' && styles.ctaOn, (!hasBusiness || busy != null) && styles.ctaDisabled]}
          >
            {busy === 'small' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.ctaText, current === 'small' && styles.ctaTextOn]}>
                {current === 'small' ? 'Current: Small' : 'Select Small'}
              </Text>
            )}
          </Pressable>

          <Text style={[styles.section, { marginTop: 18 }]}>Large storefront — $50/mo</Text>
          {LARGE_FEATURES.map((t) => (
            <Text key={t} style={styles.bullet}>
              • {t}
            </Text>
          ))}
          <Pressable
            disabled={!hasBusiness || busy != null}
            onPress={() => confirmSelect('large', 'Large Storefront', 50)}
            style={[styles.cta, current === 'large' && styles.ctaOn, (!hasBusiness || busy != null) && styles.ctaDisabled]}
          >
            {busy === 'large' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.ctaText, current === 'large' && styles.ctaTextOn]}>
                {current === 'large' ? 'Current: Large' : 'Select Large'}
              </Text>
            )}
          </Pressable>

          {current !== 'none' && hasBusiness ? (
            <Pressable
              disabled={busy != null}
              onPress={() =>
                Alert.alert('Remove add-on?', 'You can add it again later. Your store limits update after saving.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Remove', style: 'destructive', onPress: () => void selectAddon('none') },
                ])
              }
              style={styles.remove}
            >
              {busy === 'none' ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.removeText}>Remove storefront add-on</Text>}
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 36 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  lead: { marginTop: 8, fontSize: 12, lineHeight: 17, fontWeight: '600', color: colors.textMuted },
  warn: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  warnText: { fontSize: 12, fontWeight: '600', color: colors.text },
  warnBtn: { marginTop: 10, alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary },
  warnBtnText: { fontSize: 12, fontWeight: '800', color: colors.white },
  section: { marginTop: 14, fontSize: 13, fontWeight: '800', color: colors.text },
  bullet: { marginTop: 5, fontSize: 11, lineHeight: 16, fontWeight: '600', color: colors.textMuted },
  cta: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: colors.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  ctaOn: { backgroundColor: colors.primaryDark },
  ctaDisabled: { opacity: 0.45 },
  ctaText: { fontSize: 13, fontWeight: '800', color: colors.white },
  ctaTextOn: { color: colors.white },
  remove: { marginTop: 22, paddingVertical: 10, alignItems: 'center' },
  removeText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
});

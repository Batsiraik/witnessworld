import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import type { SubscriptionInfo } from '../context/DashboardContext';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'MembershipPlans'>;

type Plan = {
  key: string;
  title: string;
  price: number;
  badge?: string;
  features?: string[];
  storefront?: boolean;
};

function formatBillingDate(iso: string | null | undefined): string {
  if (!iso) return 'your trial end date';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'your trial end date';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function hasCardOnSubscription(sub: SubscriptionInfo | null | undefined): boolean {
  if (!sub) return false;
  if (String(sub.stripe_payment_method_status ?? '').toLowerCase() === 'attached') return true;
  const l4 = sub.payment_method?.last4;
  return typeof l4 === 'string' && l4.trim().length >= 4;
}

function confirmPlanChange(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });
}

export function MembershipPlansScreen({ navigation }: Props) {
  const { subscription, refreshProfile, stackNavigation, user } = useDashboardContext();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const plans = ((subscription?.plans ?? []) as Plan[]).filter((p) => p && typeof p.key === 'string');
  const currentPlan = subscription?.plan ?? 'free';

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  const choosePlan = async (planKey: string) => {
    if (planKey === currentPlan) return;

    if (planKey !== 'free') {
      const planMeta = plans.find((p) => p.key === planKey);
      const price = planMeta?.price ?? 0;
      const title = planMeta?.title ?? planKey;
      const trialDays = subscription?.trial_days ?? 90;
      const hadCard = hasCardOnSubscription(subscription);
      const trialEndLabel = formatBillingDate(subscription?.trial_ends_at ?? null);

      let msg: string;
      if (hadCard) {
        msg = `Switch to ${title} at $${price}/month?\n\nYour saved payment method stays on file. Your next charge for this plan is expected on ${trialEndLabel} (typically after your trial ends, unless you are already past trial).`;
      } else {
        msg = `Switch to ${title} at $${price}/month after your ${trialDays}-day trial?\n\nYou are not charged until after the trial. Add a card anytime under Profile → Payment method if you have not already.`;
      }

      const ok = await confirmPlanChange('Confirm plan', msg);
      if (!ok) return;
    }

    setBusyPlan(planKey);
    try {
      const data = await apiPost('membership-change.php', { membership_plan: planKey }, true);
      const freshSub =
        (await refreshProfile()) ?? ((data.subscription as SubscriptionInfo | undefined) ?? null);

      if (planKey === 'free') {
        Alert.alert(
          'Plan changed',
          'Your account is now on Free. Existing published posts may be unpublished until you reactivate.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const planMeta = plans.find((p) => p.key === planKey);
      const planTitle = planMeta?.title ?? planKey;
      const priceAfter = planMeta?.price ?? 0;
      const chargeWhen = formatBillingDate(freshSub?.trial_ends_at ?? subscription?.trial_ends_at ?? null);
      const onFile = hasCardOnSubscription(freshSub);

      if (onFile) {
        Alert.alert(
          'Plan updated',
          `You are on ${planTitle} at $${priceAfter}/month. Billing uses the card already on your account. Next charge is expected around ${chargeWhen} (after your trial if you are still in trial).`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      Alert.alert(
        'Plan updated',
        `You are on ${planTitle} at $${priceAfter}/month.\n\nAdd a payment method under Profile → Payment method so billing can continue after your trial.`,
        [
          { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: 'Add card',
            onPress: () => {
              stackNavigation.navigate('AddPaymentCard', {
                returnTo: 'pop',
                email: typeof user?.email === 'string' ? user.email : undefined,
              });
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert('Could not change plan', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusyPlan(null);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>Choose your plan</Text>
          <Text style={styles.lead}>
            Paid plans include a trial. Switch plans anytime. If you already have a card on file, billing keeps using
            that same card — you will not be asked to add it again when you change plans.
          </Text>
          <Text style={styles.note}>Storefront = separate add-on.</Text>
          {plans.map((plan) => {
            const active = plan.key === currentPlan;
            return (
              <View key={plan.key} style={[styles.card, active && styles.cardActive]}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.price}>{plan.price === 0 ? '$0/month' : `$${plan.price}/month after trial`}</Text>
                  </View>
                  {plan.badge ? <Text style={styles.badge}>{plan.badge}</Text> : null}
                </View>
                {(plan.features ?? []).map((feature) => (
                  <Text key={feature} style={styles.feature}>
                    • {feature}
                  </Text>
                ))}
                <Pressable
                  disabled={active || busyPlan != null}
                  onPress={() => void choosePlan(plan.key)}
                  style={({ pressed }) => [styles.btn, active && styles.btnActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.btnText, active && styles.btnTextActive]}>
                    {active ? 'Current plan' : busyPlan === plan.key ? 'Saving...' : plan.key === 'free' ? 'Downgrade to Free' : 'Choose plan'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 18, paddingBottom: 34 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  lead: { marginTop: 8, color: colors.textMuted, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  note: { marginTop: 12, color: colors.goldDark, fontSize: 13, fontWeight: '800' },
  card: { marginTop: 14, backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 16 },
  cardActive: { borderColor: colors.primaryDark, backgroundColor: '#F8FCFF' },
  cardTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  planTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  price: { marginTop: 3, fontSize: 13, fontWeight: '800', color: colors.textMuted },
  badge: { overflow: 'hidden', borderRadius: 999, backgroundColor: colors.goldSoft, color: colors.goldDark, paddingHorizontal: 9, paddingVertical: 4, fontSize: 11, fontWeight: '800' },
  feature: { marginTop: 8, color: colors.textMuted, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  btn: { marginTop: 14, borderRadius: 14, backgroundColor: colors.primary, paddingVertical: 12, alignItems: 'center' },
  btnActive: { backgroundColor: 'rgba(11,18,32,0.08)' },
  btnText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  btnTextActive: { color: colors.textMuted },
  pressed: { opacity: 0.9 },
});

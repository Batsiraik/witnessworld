import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
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

function confirmPlanChange(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continue', onPress: () => resolve(true) },
    ]);
  });
}

export function MembershipPlansScreen({ navigation }: Props) {
  const { subscription, refreshProfile } = useDashboardContext();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const plans = ((subscription?.plans ?? []) as Plan[]).filter((p) => p && typeof p.key === 'string');
  const currentPlan = subscription?.plan ?? 'free';

  const choosePlan = async (planKey: string) => {
    if (planKey === currentPlan) return;

    if (planKey !== 'free') {
      const planMeta = plans.find((p) => p.key === planKey);
      const price = planMeta?.price ?? 0;
      const title = planMeta?.title ?? planKey;
      const trialDays = subscription?.trial_days ?? 90;
      const hadCard = subscription?.stripe_payment_method_status === 'attached';
      const trialEndLabel = formatBillingDate(subscription?.trial_ends_at ?? null);

      let msg: string;
      if (hadCard) {
        msg = `Switch to ${title} at $${price}/month?\n\nYour saved payment method stays on file. Your next charge for this plan is expected on ${trialEndLabel} (typically after your trial ends, unless you are already past trial).`;
      } else {
        msg = `Start a ${trialDays}-day trial on ${title}. After the trial: $${price}/month.\n\nNext, you can add a card in secure checkout so billing can continue after the trial. You are not charged until after the trial.`;
      }

      const ok = await confirmPlanChange('Confirm plan', msg);
      if (!ok) return;
    }

    setBusyPlan(planKey);
    try {
      const data = await apiPost('membership-change.php', { membership_plan: planKey }, true);
      await refreshProfile();

      if (planKey === 'free') {
        Alert.alert(
          'Plan changed',
          'Your account is now on Free. Existing published posts may be unpublished until you reactivate.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      const sub = data.subscription as { stripe_payment_method_status?: string; trial_ends_at?: string | null } | undefined;
      const stripePm = String(sub?.stripe_payment_method_status ?? '');
      const planMeta = plans.find((p) => p.key === planKey);
      const planTitle = planMeta?.title ?? planKey;
      const priceAfter = planMeta?.price ?? 0;
      const chargeWhen = formatBillingDate(sub?.trial_ends_at ?? null);

      if (stripePm === 'attached') {
        Alert.alert(
          'Plan updated',
          `You are on ${planTitle} at $${priceAfter}/month. Your saved payment method will be charged starting ${chargeWhen} (after your trial if you are still in trial).`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      Alert.alert(
        'Plan updated',
        `Your trial is active. Add a card now so your ${planTitle} plan can continue after the trial ($${priceAfter}/month). You are not charged until after the trial.`,
        [
          { text: 'Later', style: 'cancel', onPress: () => navigation.goBack() },
          {
            text: 'Add card',
            onPress: () => {
              void (async () => {
                try {
                  const r = await apiPost('stripe-checkout-setup-session.php', {}, true);
                  const url = typeof r.url === 'string' ? r.url : '';
                  if (!url) throw new Error('No checkout URL returned.');
                  await Linking.openURL(url);
                } catch (e) {
                  Alert.alert('Could not open checkout', e instanceof Error ? e.message : 'Try again.');
                } finally {
                  navigation.goBack();
                }
              })();
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
            Paid plans include a free trial. If you do not already have a card on file, you will be prompted to add one after choosing a paid plan so billing can continue after the trial.
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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

export function MembershipPlansScreen({ navigation }: Props) {
  const { subscription, refreshProfile } = useDashboardContext();
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const plans = ((subscription?.plans ?? []) as Plan[]).filter((p) => p && typeof p.key === 'string');
  const currentPlan = subscription?.plan ?? 'free';

  const choosePlan = async (planKey: string) => {
    setBusyPlan(planKey);
    try {
      await apiPost('membership-change.php', { membership_plan: planKey }, true);
      await refreshProfile();
      Alert.alert(
        planKey === 'free' ? 'Plan changed' : 'Plan selected',
        planKey === 'free'
          ? 'Your account is now on Free. Existing published posts may be unpublished until you reactivate.'
          : 'Your plan is selected. Stripe card collection will be connected in the payment pass.'
      );
      navigation.goBack();
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
            Paid plans start with the admin-configured free trial. Card collection and auto-charge will be connected through Stripe.
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
                  <Text key={feature} style={styles.feature}>• {feature}</Text>
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

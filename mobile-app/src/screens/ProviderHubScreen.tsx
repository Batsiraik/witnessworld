import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProviderHub'>;

type HubRow = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  onPress: () => void;
};

export function ProviderHubScreen({ navigation }: Props) {
  const { user, subscription } = useDashboardContext();
  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');
  const canPost = subscription?.features?.can_post === true;
  const planTitle = subscription?.plan_title ?? 'User Member';
  const trialEnds = subscription?.trial_ends_at ? `Trial ends ${String(subscription.trial_ends_at).slice(0, 10)}` : null;
  const hasBusiness = subscription?.has_business_membership === true;
  const storefrontAddon = subscription?.storefront_addon ?? 'none';

  const usageLine = useMemo(() => {
    const lim = subscription?.usage?.marketplace_listings_limit ?? 0;
    const rem = subscription?.usage?.marketplace_listings_remaining ?? 0;
    if (!canPost || lim <= 0) {
      return 'Upgrade for marketplace ad slots.';
    }
    if (rem <= 0) {
      return 'At your plan limit for marketplace ads.';
    }
    return `${rem} marketplace ad${rem === 1 ? '' : 's'} left`;
  }, [subscription, canPost]);

  const requireAvatar = (then: () => void) => {
    if (!canPost) {
      Alert.alert('Upgrade required', 'Free members can browse and message, but posting requires a paid plan.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Change plan', onPress: () => navigation.navigate('MembershipPlans') },
      ]);
      return;
    }
    if (!hasAvatar) {
      Alert.alert(
        'Profile photo required',
        'Upload a profile picture first so people can recognize who they are hiring. You can add one in Profile & settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }
    then();
  };

  const rows: HubRow[] = [
    {
      key: 'classified',
      title: 'Marketplace listing',
      subtitle: 'Sell products or items',
      icon: 'bag-handle-outline',
      iconBg: '#E8F4FD',
      iconColor: '#1D4ED8',
      onPress: () =>
        requireAvatar(() => navigation.navigate('CreateListing', { listingType: 'classified', seed: Date.now() })),
    },
    {
      key: 'service',
      title: 'Service listing',
      subtitle: 'Offer skills or packages',
      icon: 'construct-outline',
      iconBg: '#F3E8FF',
      iconColor: '#7C3AED',
      onPress: () =>
        requireAvatar(() => navigation.navigate('CreateListing', { listingType: 'service', seed: Date.now() })),
    },
    {
      key: 'store',
      title: 'Online store',
      subtitle: 'Open your storefront',
      icon: 'storefront-outline',
      iconBg: '#DCFCE7',
      iconColor: '#15803D',
      onPress: () =>
        requireAvatar(() => {
          if (!hasBusiness) {
            Alert.alert(
              'Business plan required',
              'Storefronts are for Starter, Growth, or Elite. Upgrade your membership, then choose a storefront add-on.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Membership plans', onPress: () => navigation.navigate('MembershipPlans') },
              ]
            );
            return;
          }
          if (storefrontAddon !== 'small' && storefrontAddon !== 'large') {
            navigation.navigate('StorefrontAddon');
            return;
          }
          navigation.navigate('CreateStore', { seed: Date.now() });
        }),
    },
    {
      key: 'directory',
      title: 'Business directory',
      subtitle: 'List your business',
      icon: 'business-outline',
      iconBg: '#CCFBF1',
      iconColor: '#0D9488',
      onPress: () => requireAvatar(() => navigation.navigate('CreateDirectoryEntry', { seed: Date.now() })),
    },
    {
      key: 'community',
      title: 'Community classified',
      subtitle: 'Post a notice or need',
      icon: 'people-outline',
      iconBg: '#FEF3C7',
      iconColor: '#B45309',
      onPress: () =>
        requireAvatar(() => navigation.navigate('CreateListing', { listingType: 'community', seed: Date.now() })),
    },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.planCard}>
            <View style={styles.planCardHeader}>
              <Text style={styles.planLabel}>Current plan</Text>
              <Pressable onPress={() => navigation.navigate('MembershipPlans')} style={styles.planBtn}>
                <Text style={styles.planBtnText}>Change plan</Text>
              </Pressable>
            </View>
            <Text style={styles.planTitle}>{planTitle}</Text>
            {trialEnds ? <Text style={styles.planMeta}>{trialEnds}</Text> : null}
            <Text style={styles.planUsage}>{usageLine}</Text>
            <Pressable onPress={() => navigation.navigate('StorefrontAddon')} style={styles.addonRow} hitSlop={6}>
              <Text style={styles.addonRowLabel}>
                {storefrontAddon === 'small' || storefrontAddon === 'large'
                  ? `Storefront · ${storefrontAddon === 'small' ? 'Small' : 'Large'}`
                  : 'Storefront add-on'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </Pressable>
          </View>
          <Text style={styles.pageSub}>What would you like to post?</Text>

          {rows.map((row) => (
            <Pressable
              key={row.key}
              onPress={row.onPress}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={[styles.iconWrap, { backgroundColor: row.iconBg }]}>
                <Ionicons name={row.icon} size={24} color={row.iconColor} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {row.title}
                </Text>
                <Text style={styles.cardSubtitle} numberOfLines={2}>
                  {row.subtitle}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 4 },
  pageSub: {
    fontSize: 15,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 18,
  },
  planCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    marginBottom: 16,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  planLabel: { fontSize: 11, fontWeight: '800', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  planTitle: { marginTop: 6, fontSize: 17, fontWeight: '800', color: colors.text },
  planMeta: { marginTop: 3, fontSize: 12, fontWeight: '700', color: colors.goldDark },
  planUsage: { marginTop: 5, fontSize: 11, lineHeight: 15, fontWeight: '600', color: colors.textMuted },
  addonRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  addonRowLabel: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  planBtn: { borderRadius: 999, backgroundColor: colors.primarySoft, paddingHorizontal: 12, paddingVertical: 8 },
  planBtnText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: colors.white,
    marginBottom: 12,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSubtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
});

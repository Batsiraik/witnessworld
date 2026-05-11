import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
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
  const { user } = useDashboardContext();
  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');

  const requireAvatar = (then: () => void) => {
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
      onPress: () => requireAvatar(() => navigation.navigate('CreateStore', { seed: Date.now() })),
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
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
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

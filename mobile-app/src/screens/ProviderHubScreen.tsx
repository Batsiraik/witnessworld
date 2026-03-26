import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProviderHub'>;

export function ProviderHubScreen({ navigation }: Props) {
  const { user } = useDashboardContext();
  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');

  const goCreate = (listingType: 'classified' | 'service') => {
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
    navigation.navigate('CreateListing', { listingType, seed: Date.now() });
  };

  const goCreateStore = () => {
    if (!hasAvatar) {
      Alert.alert(
        'Profile photo required',
        'Upload a profile picture first. You can add one in Profile & settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }
    navigation.navigate('CreateStore', { seed: Date.now() });
  };

  const goDirectory = () => {
    if (!hasAvatar) {
      Alert.alert(
        'Profile photo required',
        'Upload a profile picture first. You can add one in Profile & settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open profile', onPress: () => navigation.navigate('Profile') },
        ]
      );
      return;
    }
    navigation.navigate('CreateDirectoryEntry', { seed: Date.now() });
  };

  const comingSoon = (label: string) => {
    Alert.alert('Coming soon', `${label} will be available in a future update.`);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.lead}>
            Pick the type that matches what you’re posting.{' '}
            <Text style={styles.leadEm}>Classifieds</Text> are for local ads—items, one-off gigs, roommate wanted,
            “looking for,” and general notices.{' '}
            <Text style={styles.leadEm}>Services</Text> are for “hire me” work—ongoing skills, packages, and
            professional offers. Same account can use both.
          </Text>

          <Pressable
            onPress={() => goCreate('classified')}
            style={({ pressed }) => [styles.card, styles.cardClassified, pressed && styles.cardPressed]}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="newspaper-outline" size={26} color={colors.primaryDark} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardEyebrow}>Local ads · buy / sell / notice</Text>
              <Text style={styles.cardTitle}>Classified marketplace</Text>
              <Text style={styles.cardSub}>
                Post an ad people browse like classifieds—what you’re selling, offering once, or looking for. Great for
                stuff, quick jobs, and community posts.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => goCreate('service')}
            style={({ pressed }) => [styles.card, styles.cardService, pressed && styles.cardPressed]}
          >
            <View style={[styles.cardIcon, styles.cardIconService]}>
              <Ionicons name="briefcase-outline" size={26} color="#0f766e" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardEyebrowService}>Hire me · skills & packages</Text>
              <Text style={styles.cardTitle}>Service marketplace</Text>
              <Text style={styles.cardSub}>
                Present yourself as a provider—what you do for clients, how you work, and proof of quality. Built for
                ongoing services (design, repairs, tutoring, etc.).
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => goCreateStore()}
            style={({ pressed }) => [styles.card, styles.cardStore, pressed && styles.cardPressed]}
          >
            <View style={[styles.cardIcon, styles.cardIconStore]}>
              <Ionicons name="storefront-outline" size={26} color="#6d28d9" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardEyebrowStore}>E-commerce · your brand</Text>
              <Text style={styles.cardTitle}>Open an online store</Text>
              <Text style={styles.cardSub}>
                Logo, banner, what you sell, delivery area, and location. Your store is reviewed before you can list
                products.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => goDirectory()}
            style={({ pressed }) => [styles.card, styles.cardDir, pressed && styles.cardPressed]}
          >
            <View style={[styles.cardIcon, styles.cardIconDir]}>
              <Ionicons name="business-outline" size={26} color="#0e7490" />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardEyebrowDir}>Discover · contact · map</Text>
              <Text style={styles.cardTitle}>Business directory listing</Text>
              <Text style={styles.cardSub}>
                Add your business with public phone, email, website, and map link. Several listings per account. Shown
                after admin approval when people filter by location.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
  lead: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 20,
  },
  leadEm: { fontWeight: '800', color: colors.text },
  cardEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardEyebrowService: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f766e',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 12,
  },
  cardClassified: {
    borderColor: 'rgba(31, 170, 242, 0.4)',
    backgroundColor: 'rgba(31, 170, 242, 0.1)',
  },
  cardService: {
    borderColor: 'rgba(15, 118, 110, 0.35)',
    backgroundColor: 'rgba(15, 118, 110, 0.1)',
  },
  cardStore: {
    borderColor: 'rgba(109, 40, 217, 0.35)',
    backgroundColor: 'rgba(109, 40, 217, 0.1)',
  },
  cardMuted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    marginBottom: 12,
  },
  cardPressed: { opacity: 0.92 },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIconService: { backgroundColor: 'rgba(15, 118, 110, 0.15)' },
  cardIconStore: { backgroundColor: 'rgba(109, 40, 217, 0.15)' },
  cardDir: {
    borderColor: 'rgba(14, 116, 144, 0.35)',
    backgroundColor: 'rgba(14, 116, 144, 0.1)',
  },
  cardIconDir: { backgroundColor: 'rgba(14, 116, 144, 0.15)' },
  cardIconMuted: { backgroundColor: 'rgba(148, 163, 184, 0.2)' },
  cardEyebrowDir: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0e7490',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardEyebrowStore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6d28d9',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardTitleMuted: { fontSize: 16, fontWeight: '800', color: colors.textMuted },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  cardSubMuted: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500', opacity: 0.9 },
});

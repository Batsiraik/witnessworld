import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import type { DiscoverStackParamList, HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<DiscoverStackParamList, 'Discover'>;

const SHORTCUTS: {
  title: string;
  subtitle: string;
  screen: keyof HomeStackParamList;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}[] = [
  {
    title: 'Service marketplace',
    subtitle: 'Skills, gigs, and packages',
    screen: 'Services',
    icon: 'construct-outline',
    color: '#7C3AED',
    bg: '#F3E8FF',
  },
  {
    title: 'Classified marketplace',
    subtitle: 'Local ads and deals',
    screen: 'Classifieds',
    icon: 'bag-handle-outline',
    color: '#1D4ED8',
    bg: '#E8F4FD',
  },
  {
    title: 'Shop products',
    subtitle: 'From member stores',
    screen: 'ProductsBrowse',
    icon: 'pricetag-outline',
    color: '#C2410C',
    bg: '#FFEDD5',
  },
  {
    title: 'Online stores',
    subtitle: 'Storefronts and brands',
    screen: 'Stores',
    icon: 'storefront-outline',
    color: '#15803D',
    bg: '#DCFCE7',
  },
  {
    title: 'Business directory',
    subtitle: 'Local businesses',
    screen: 'Directory',
    icon: 'business-outline',
    color: '#0D9488',
    bg: '#CCFBF1',
  },
];

export function DiscoverScreen({ navigation }: Props) {
  const go = (screen: keyof HomeStackParamList) => {
    navigation.getParent()?.navigate('HomeTab', { screen });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.headline}>Explore</Text>
          <Text style={styles.sub}>Search and browse everything on WitnessWorld Connect.</Text>
          <View style={styles.grid}>
            {SHORTCUTS.map((s) => (
              <Pressable
                key={s.screen}
                onPress={() => go(s.screen)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={[styles.iconWrap, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={26} color={s.color} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <Text style={styles.cardSub}>{s.subtitle}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 8 },
  headline: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  sub: { fontSize: 14, color: colors.textMuted, marginTop: 8, marginBottom: 20, fontWeight: '500' },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.06)',
  },
  cardPressed: { opacity: 0.92 },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
});

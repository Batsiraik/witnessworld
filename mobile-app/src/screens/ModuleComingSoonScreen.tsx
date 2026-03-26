import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import type { HomeStackParamList, InboxStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const COPY = {
  Classifieds: {
    headline: 'Classified marketplace',
    body: 'Item listings, categories, images, and messaging will live here — manage your listings and connect with buyers.',
  },
  Services: {
    headline: 'Service marketplace',
    body: 'Service gigs, packages, orders, delivery tracking, and reviews — fixed or hourly pricing, like Fiverr.',
  },
  Stores: {
    headline: 'Online stores',
    body: 'Create a store, list products, manage inventory, and process orders.',
  },
  Directory: {
    headline: 'Business directory',
    body: 'Business listings with categories, search, and filters.',
  },
  Inbox: {
    headline: 'Inbox',
    body: 'Messages and notifications from buyers and sellers will appear here.',
  },
} as const;

type ModuleRoute = keyof typeof COPY;

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'Classifieds' | 'Services' | 'Stores' | 'Directory'>
  | NativeStackScreenProps<InboxStackParamList, 'Inbox'>;

export function ModuleComingSoonScreen({ route }: Props) {
  const name = route.name as ModuleRoute;
  const meta = COPY[name] ?? {
    headline: route.name,
    body: 'This section is coming soon.',
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.card}>
          <Text style={styles.headline}>{meta.headline}</Text>
          <Text style={styles.body}>{meta.body}</Text>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Coming soon</Text>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  card: {
    borderRadius: 22,
    padding: 22,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  headline: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, lineHeight: 22, color: colors.textMuted, fontWeight: '500' },
  pill: {
    alignSelf: 'flex-start',
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  pillText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsOfService'>;

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Acceptance of Terms',
    body: [
      'By accessing or using Witness World Connect, you agree to these Terms of Service. If you do not agree, please do not use our platform.',
    ],
  },
  {
    title: '2. Eligibility',
    body: [
      'Witness World Connect is designed for active members of the JW community. Verification of active status in a congregation is required.',
      '● Upon registration, a verification form will be emailed to all users.',
      '● Your account status will remain pending until the completed form is submitted and reviewed.',
      '● Failure to provide verification may result in denial of membership.',
      'By registering, you agree to this verification process as part of maintaining the integrity and purpose of the Witness World Connect community.',
    ],
  },
  {
    title: '3. Memberships and Fees',
    body: [
      '● Free Membership allows limited access to services.',
      '● Paid Memberships offer additional features as described on our site.',
      '● Fees for paid memberships are non-refundable.',
    ],
  },
  {
    title: '4. User Responsibilities',
    body: [
      '● Users must provide accurate and honest information when posting ads or services.',
      '● Users are responsible for complying with all local, state, and federal laws related to their activities on the site.',
    ],
  },
  {
    title: '5. Prohibited Activities',
    body: [
      '● Posting content that is illegal, offensive, or violates community guidelines.',
      '● Spamming, phishing, or misrepresentation.',
      '● Using the platform for activities unrelated to its intended purpose.',
    ],
  },
  {
    title: '6. Content Ownership',
    body: [
      'You retain ownership of the content you post but grant Witness World Connect a license to use, modify, or display your content to provide services.',
    ],
  },
  {
    title: '7. Limitation of Liability',
    body: [
      'Witness World Connect is not responsible for disputes between users, including transactions, listings, or interactions.',
    ],
  },
  {
    title: '8. Termination',
    body: [
      'We reserve the right to suspend or terminate accounts that violate these terms or for other reasons at our discretion.',
    ],
  },
  {
    title: '9. Changes to Terms',
    body: [
      'We may update these Terms of Service periodically. Continued use of the platform signifies acceptance of changes.',
    ],
  },
  {
    title: '10. Affiliation Disclaimer',
    body: [
      "Witness World Connect is an independent platform created for Jehovah's Witnesses worldwide to share services, connect, and support one another. We are not affiliated with, endorsed by, or officially connected to the Watch Tower Bible and Tract Society of Pennsylvania or any of its associated entities. For official information, including finding a Kingdom Hall, convention details, or spiritual resources, please visit jw.org.",
    ],
  },
];

export function TermsOfServiceScreen({ navigation }: Props) {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Terms and conditions" onBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Text style={styles.intro}>
            Please read these Terms of Service carefully before using Witness World Connect.
          </Text>
          {SECTIONS.map((s) => (
            <View key={s.title} style={styles.block}>
              <Text style={styles.sectionTitle}>{s.title}</Text>
              {s.body.map((line, i) => (
                <Text key={`${s.title}-${i}`} style={styles.paragraph}>
                  {line}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  intro: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 20,
  },
  block: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
});

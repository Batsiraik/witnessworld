import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacyPolicy'>;

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: '1. Information We Collect',
    body: [
      '● Personal Information: Name, email address, and contact details when you register or purchase a membership.',
      '● Usage Information: IP address, device type, and browsing activity on the platform.',
    ],
  },
  {
    title: '2. How We Use Your Information',
    body: [
      '● To provide and improve our services.',
      '● To communicate with you about updates, memberships, or promotional offers.',
      '● To enforce our Terms of Service and maintain platform security.',
    ],
  },
  {
    title: '3. Sharing Your Information',
    body: [
      'We do not sell or share your information with third parties, except:',
      '● As required by law.',
      '● With trusted service providers to operate the platform (e.g., payment processors).',
    ],
  },
  {
    title: '4. Cookies and Tracking',
    body: [
      'We use cookies to enhance user experience, analyze site traffic, and personalize content. You can disable cookies in your browser settings at any time.',
    ],
  },
  {
    title: '5. Data Security',
    body: [
      'We implement appropriate technical and organizational measures to protect your information but cannot guarantee 100% security.',
    ],
  },
  {
    title: '6. Your Rights',
    body: [
      '● Access or update your personal information.',
      '● Request deletion of your account and data.',
      '● Opt out of non-essential communications.',
    ],
  },
  {
    title: "7. Children's Privacy",
    body: [
      'The platform is not intended for children under 13. If we learn that a child’s information has been collected without parental consent, we will delete it promptly.',
    ],
  },
  {
    title: '8. Changes to this Privacy Policy',
    body: [
      'We may update this Privacy Policy periodically. Significant changes will be communicated to users.',
    ],
  },
  {
    title: '9. Contact Us',
    body: [
      'For questions or concerns about this Privacy Policy, contact us at: info@witnessworldconnect.com',
    ],
  },
];

export function PrivacyPolicyScreen({ navigation }: Props) {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader title="Privacy Policy" onBack={() => navigation.goBack()} />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
        >
          <Text style={styles.intro}>
            Witness World Connect respects your privacy. This policy describes how we handle
            information when you use our services.
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

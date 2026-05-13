import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiPost } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'HireComingSoon'>;

export function HireComingSoonScreen({ route }: Props) {
  const u = route.params?.username?.trim();
  const peerUserId = route.params?.peerUserId;
  const { user, isGuest, showGuestPrompt, stackNavigation } = useDashboardContext();
  const [buyerName, setBuyerName] = useState([user?.first_name, user?.last_name].filter(Boolean).join(' ').trim());
  const [buyerEmail, setBuyerEmail] = useState(user?.email ?? '');
  const [buyerPhone, setBuyerPhone] = useState(user?.phone ?? '');
  const [brief, setBrief] = useState('');
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (isGuest) {
      showGuestPrompt();
      return;
    }
    if (!peerUserId || peerUserId <= 0) {
      Alert.alert('Open a listing first', 'Please start hire requests from a profile, service, business, or chat with a known member.');
      return;
    }
    if (!buyerName.trim() || !brief.trim()) {
      Alert.alert('Details required', 'Please add your name and describe what you need.');
      return;
    }
    if (!ack) {
      Alert.alert('Safety reminder', 'Please confirm the anti-scam reminder before sending.');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(
        'commerce-request-create.php',
        {
          subject_type: 'member',
          subject_id: peerUserId,
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim(),
          project_brief: brief.trim(),
          preferred_contact: 'WWC app chat',
          anti_scam_ack: ack,
        },
        true
      );
      Alert.alert('Request sent', 'The member has been notified in the app and by email.');
      stackNavigation.navigate('Dashboard', { screen: 'HomeTab', params: { screen: 'Cart' } });
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.box}>
            <Text style={styles.title}>{u ? `Hire ${u}` : 'Send hire request'}</Text>
            <Text style={styles.body}>
              Tell this member what you need. WWC keeps a request record so admin can review scams, disputes, or suspicious behavior.
            </Text>
            <TextInput value={buyerName} onChangeText={setBuyerName} placeholder="Your name" style={styles.input} />
            <TextInput value={buyerEmail} onChangeText={setBuyerEmail} placeholder="Email" keyboardType="email-address" style={styles.input} />
            <TextInput value={buyerPhone} onChangeText={setBuyerPhone} placeholder="Phone / WhatsApp" style={styles.input} />
            <TextInput
              value={brief}
              onChangeText={setBrief}
              placeholder="Describe the work, timeline, budget, and anything important."
              multiline
              style={[styles.input, styles.textArea]}
            />
            <Pressable onPress={() => setAck((v) => !v)} style={styles.ackRow}>
              <View style={[styles.checkbox, ack && styles.checkboxOn]} />
              <Text style={styles.ackText}>
                I will keep communication inside WWC, avoid off-platform payment pressure, and report suspicious behavior.
              </Text>
            </Pressable>
            <PrimaryButton label="Send hire request" onPress={() => void submit()} loading={submitting} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 34 },
  box: { flex: 1, paddingHorizontal: 4, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.textMuted },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 140, textAlignVertical: 'top' },
  ackRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 18 },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: colors.primaryDark, marginTop: 2 },
  checkboxOn: { backgroundColor: colors.primaryDark },
  ackText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.textMuted, fontWeight: '600' },
});

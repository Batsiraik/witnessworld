import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, getStoredToken } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'HireComingSoon'>;

export function HireComingSoonScreen({ route, navigation }: Props) {
  const u = route.params?.username?.trim();
  const peerUserId = route.params?.peerUserId;

  /** This screen is on the root stack (outside DashboardProvider); load session directly. */
  const [sessionLoading, setSessionLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [brief, setBrief] = useState('');
  const [ack, setAck] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionLoading(true);
      try {
        const tok = await getStoredToken();
        if (!tok) {
          if (!cancelled) setSignedIn(false);
          return;
        }
        const data = await apiGet('me.php', true);
        const row = data.user as Record<string, unknown> | undefined;
        if (cancelled || !row) return;
        setSignedIn(true);
        const first = typeof row.first_name === 'string' ? row.first_name : '';
        const last = typeof row.last_name === 'string' ? row.last_name : '';
        setBuyerName([first, last].filter(Boolean).join(' ').trim());
        setBuyerEmail(typeof row.email === 'string' ? row.email : '');
        setBuyerPhone(typeof row.phone === 'string' ? row.phone : '');
      } catch {
        if (!cancelled) setSignedIn(false);
      } finally {
        if (!cancelled) setSessionLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const promptSignIn = () => {
    Alert.alert('Sign in required', 'Please sign in to send a hire request.', [
      { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      { text: 'Sign in', onPress: () => navigation.navigate('Login') },
    ]);
  };

  const submit = async () => {
    if (!signedIn) {
      promptSignIn();
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
      navigation.navigate('Dashboard', { screen: 'HomeTab', params: { screen: 'Cart' } });
    } catch (e) {
      Alert.alert('Could not send request', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {sessionLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.box}>
              <Text style={styles.title}>{u ? `Hire ${u}` : 'Send hire request'}</Text>
              <Text style={styles.body}>
                Tell this member what you need. WWC keeps a request record so admin can review scams, disputes, or
                suspicious behavior.
              </Text>
              <TextInput value={buyerName} onChangeText={setBuyerName} placeholder="Your name" style={styles.input} />
              <TextInput
                value={buyerEmail}
                onChangeText={setBuyerEmail}
                placeholder="Email"
                keyboardType="email-address"
                style={styles.input}
              />
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
                  I will keep communication inside WWC, avoid off-platform payment pressure, and report suspicious
                  behavior.
                </Text>
              </Pressable>
              <PrimaryButton label="Send hire request" onPress={() => void submit()} loading={submitting} />
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
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

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiOpenConversation, apiSubmitReport } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ReportSheet } from '../components/ReportSheet';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { openInboxChat } from '../navigation/openInboxChat';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'DirectoryDetail'>;

type Entry = {
  id: number;
  business_name: string;
  tagline: string | null;
  description: string | null;
  category_label: string;
  location_country_name: string;
  location_us_state: string | null;
  address_line: string | null;
  city: string;
  postal_code: string | null;
  phone: string;
  email: string;
  website: string | null;
  map_url: string | null;
  hours_text: string | null;
  logo_url: string | null;
  owner_user_id: number;
  owner_label: string;
  owner_username: string;
};

export function DirectoryDetailScreen({ navigation, route }: Props) {
  const { id } = route.params;
  const { user } = useDashboardContext();
  const myId = user?.id ?? 0;
  const [entry, setEntry] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [msgBusy, setMsgBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await apiGet(`directory-detail.php?id=${id}`, false);
        if (cancelled) return;
        const E = data.entry as Entry | undefined;
        if (!E) {
          setErr('Not found');
          return;
        }
        setEntry(E);
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const openUrl = (u: string) => {
    void Linking.openURL(u);
  };

  const messageOwner = async () => {
    if (!entry) return;
    if (entry.owner_user_id === myId) {
      Alert.alert('Yours', 'This is your directory listing.');
      return;
    }
    setMsgBusy(true);
    try {
      const { conversation_id } = await apiOpenConversation({
        peer_user_id: entry.owner_user_id,
        context_type: 'directory_entry',
        context_id: entry.id,
      });
      openInboxChat(navigation, conversation_id, entry.owner_label);
    } catch (e) {
      Alert.alert('Could not start chat', e instanceof Error ? e.message : 'Error');
    } finally {
      setMsgBusy(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (err || !entry) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <Text style={styles.err}>{err || 'Not found'}</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const addressParts = [
    entry.address_line,
    entry.city,
    entry.postal_code,
    entry.location_us_state,
    entry.location_country_name,
  ].filter(Boolean);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          {entry.logo_url ? (
            <Image source={{ uri: entry.logo_url }} style={styles.heroLogo} />
          ) : null}
          <Text style={styles.title}>{entry.business_name}</Text>
          <Text style={styles.meta}>
            {entry.category_label}
            {addressParts.length ? ` · ${addressParts.join(', ')}` : ''}
          </Text>
          {entry.tagline ? <Text style={styles.tagline}>{entry.tagline}</Text> : null}
          {entry.description ? <Text style={styles.body}>{entry.description}</Text> : null}

          <View style={styles.actions}>
            <Pressable onPress={() => openUrl(`tel:${entry.phone.replace(/\s/g, '')}`)} style={styles.actionBtn}>
              <Ionicons name="call-outline" size={20} color={colors.primaryDark} />
              <Text style={styles.actionText}>{entry.phone}</Text>
            </Pressable>
            <Pressable onPress={() => openUrl(`mailto:${entry.email}`)} style={styles.actionBtn}>
              <Ionicons name="mail-outline" size={20} color={colors.primaryDark} />
              <Text style={[styles.actionText, styles.actionTextShrink]} numberOfLines={2}>
                {entry.email}
              </Text>
            </Pressable>
            {entry.website ? (
              <Pressable onPress={() => openUrl(entry.website!)} style={styles.actionBtn}>
                <Ionicons name="globe-outline" size={20} color={colors.primaryDark} />
                <Text style={[styles.actionText, styles.actionTextShrink]} numberOfLines={2}>
                  Website
                </Text>
              </Pressable>
            ) : null}
            {entry.map_url ? (
              <Pressable onPress={() => openUrl(entry.map_url!)} style={styles.actionBtn}>
                <Ionicons name="map-outline" size={20} color={colors.primaryDark} />
                <Text style={styles.actionText}>Location</Text>
              </Pressable>
            ) : null}
          </View>

          {entry.hours_text ? (
            <>
              <Text style={styles.section}>Hours</Text>
              <Text style={styles.body}>{entry.hours_text}</Text>
            </>
          ) : null}

          <Text style={styles.section}>Listed by</Text>
          <Text style={styles.body}>
            {entry.owner_label} (@{entry.owner_username})
          </Text>

          {entry.owner_user_id !== myId ? (
            <PrimaryButton label="Message owner" onPress={() => void messageOwner()} loading={msgBusy} />
          ) : null}
          <PrimaryButton
            label="Report this listing"
            variant="outline"
            style={styles.reportBtn}
            onPress={() => setReportOpen(true)}
          />
        </ScrollView>
        <ReportSheet
          visible={reportOpen}
          title="Report directory listing"
          onClose={() => setReportOpen(false)}
          onSubmit={async (reason) => {
            await apiSubmitReport({ subject_type: 'directory_entry', subject_id: entry.id, reason });
            Alert.alert('Thanks', 'Your report was sent to moderation.');
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  err: { color: '#b91c1c', fontWeight: '600' },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, paddingTop: 12 },
  heroLogo: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: colors.primarySoft,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, textAlign: 'center' },
  meta: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, fontWeight: '600' },
  tagline: { fontSize: 15, color: colors.text, textAlign: 'center', marginTop: 12, fontWeight: '600' },
  body: { fontSize: 15, color: colors.textMuted, marginTop: 10, lineHeight: 22 },
  section: { fontSize: 13, fontWeight: '800', color: colors.text, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  actions: { marginTop: 20, gap: 10 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  actionText: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
  actionTextShrink: { flexShrink: 1 },
  reportBtn: { marginTop: 10 },
});

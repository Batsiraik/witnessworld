import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import type { InboxStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<InboxStackParamList, 'Inbox'>;

type Row = {
  id: number;
  context_key: string;
  peer: { user_id: number; label: string; username: string; avatar_url: string | null };
  last_message: string | null;
  updated_at: string;
};

export function InboxListScreen({ navigation }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (mode: 'full' | 'refresh' = 'full') => {
    if (mode === 'refresh') setRefreshing(true);
    else setLoading(true);
    setErr(null);
    try {
      const data = await apiGet('conversations-list.php', true);
      const L = data.conversations;
      setRows(Array.isArray(L) ? (L as Row[]) : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Error');
      setRows([]);
    } finally {
      if (mode === 'refresh') setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load('full');
    }, [load])
  );

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : err ? (
          <ScrollView
            contentContainerStyle={styles.errScroll}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            <Text style={styles.err}>{err}</Text>
          </ScrollView>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load('refresh')}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              <Text style={styles.empty}>No conversations yet. Contact a seller from a listing or product.</Text>
            }
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() =>
                  navigation.navigate('Chat', { conversationId: item.id, peerName: item.peer.label })
                }
              >
                {item.peer.avatar_url ? (
                  <Image source={{ uri: item.peer.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPh]}>
                    <Text style={styles.avatarLetter}>{item.peer.label.slice(0, 1).toUpperCase()}</Text>
                  </View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.peer.label || item.peer.username}
                  </Text>
                  <Text style={styles.preview} numberOfLines={2}>
                    {item.last_message || 'Tap to open thread'}
                  </Text>
                </View>
                <Text style={styles.time} numberOfLines={1}>
                  {item.updated_at.slice(5, 16).replace('T', ' ')}
                </Text>
              </Pressable>
            )}
          />
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errScroll: { flexGrow: 1, padding: 20 },
  err: { color: '#b91c1c', textAlign: 'center', margin: 20, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, paddingHorizontal: 24, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: 10,
  },
  rowPressed: { opacity: 0.92 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primarySoft },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '800', color: colors.primaryDark },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  preview: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  time: { fontSize: 11, color: colors.textMuted, fontWeight: '600', maxWidth: 72, textAlign: 'right' },
});

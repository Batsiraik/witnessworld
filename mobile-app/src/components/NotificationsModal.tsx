import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiGet, apiPost } from '../api/client';
import { colors } from '../theme/colors';

export type UserNotification = {
  id: number;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
};

function formatWhen(iso: string): string {
  const d = new Date(iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) {
    return iso;
  }
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function NotificationsModal({ visible, onClose, onUnreadChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiGet('user-notifications.php');
      if (!res.ok) {
        throw new Error(typeof res.error === 'string' ? res.error : 'Could not load notifications');
      }
      const list = Array.isArray(res.notifications) ? (res.notifications as UserNotification[]) : [];
      setItems(list);
      const unread = typeof res.unread_count === 'number' ? res.unread_count : 0;
      onUnreadChange?.(unread);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load notifications');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [onUnreadChange]);

  useEffect(() => {
    if (!visible) return;
    void load();
    void apiPost('user-notifications-read.php', {}).then(() => {
      onUnreadChange?.(0);
    });
  }, [visible, load, onUnreadChange]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Notifications</Text>
            <Pressable
              accessibilityLabel="Close notifications"
              onPress={onClose}
              style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : err ? (
            <View style={styles.center}>
              <Text style={styles.errText}>{err}</Text>
              <Pressable onPress={() => void load()} style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications to display here.</Text>
              <Text style={styles.emptyHint}>Updates about messages, listings, and orders will appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <View style={[styles.row, !item.is_read && styles.rowUnread]}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
                  <Text style={styles.rowWhen}>{formatWhen(item.created_at)}</Text>
                </View>
              )}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '88%',
    minHeight: 220,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  center: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  errText: { color: colors.danger, textAlign: 'center', fontWeight: '600' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { color: colors.primary, fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 12, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  list: { maxHeight: 420 },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingVertical: 14,
    gap: 4,
  },
  rowUnread: { backgroundColor: 'rgba(37, 99, 235, 0.04)' },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowBody: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  rowWhen: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  pressed: { opacity: 0.9 },
});

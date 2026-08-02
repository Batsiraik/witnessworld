import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
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
  data?: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
};

export type NotificationNavTarget =
  | { kind: 'order'; id: number }
  | { kind: 'chat'; conversationId: number }
  | { kind: 'listing'; id: number }
  | { kind: 'store'; id: number }
  | { kind: 'product'; id: number }
  | { kind: 'directory'; id: number }
  | { kind: 'orders' }
  | { kind: 'office' }
  | { kind: 'profile' };

type Props = {
  visible: boolean;
  onClose: () => void;
  onUnreadChange?: (count: number) => void;
  onNavigate?: (target: NotificationNavTarget) => void;
};

const PAGE_SIZE = 40;

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

function numFrom(data: Record<string, unknown> | undefined, ...keys: string[]): number {
  if (!data) return 0;
  for (const k of keys) {
    const v = data[k];
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

export function resolveNotificationTarget(item: UserNotification): NotificationNavTarget | null {
  const type = String(item.type || item.data?.type || 'general').toLowerCase();
  const data = item.data ?? {};

  if (type === 'new_message' || type === 'support_message') {
    const cid = numFrom(data, 'conversation_id');
    if (cid > 0) return { kind: 'chat', conversationId: cid };
    return null;
  }
  if (type === 'commerce_request') {
    const id = numFrom(data, 'request_id', 'id');
    if (id > 0) return { kind: 'order', id };
    return { kind: 'orders' };
  }
  if (type === 'listing') {
    const id = numFrom(data, 'listing_id', 'id');
    if (id > 0) return { kind: 'listing', id };
    return { kind: 'office' };
  }
  if (type === 'store') {
    const id = numFrom(data, 'store_id', 'id');
    if (id > 0) return { kind: 'store', id };
    return { kind: 'office' };
  }
  if (type === 'product') {
    const id = numFrom(data, 'product_id', 'id');
    if (id > 0) return { kind: 'product', id };
    return { kind: 'office' };
  }
  if (type === 'directory_entry' || type === 'directory') {
    const id = numFrom(data, 'entry_id', 'directory_entry_id', 'id');
    if (id > 0) return { kind: 'directory', id };
    return { kind: 'office' };
  }
  if (type === 'account') {
    return { kind: 'profile' };
  }
  return null;
}

function actionLabel(target: NotificationNavTarget | null): string | null {
  if (!target) return null;
  switch (target.kind) {
    case 'order':
      return 'Open request';
    case 'orders':
      return 'View orders';
    case 'chat':
      return 'Open message';
    case 'listing':
      return 'View listing';
    case 'store':
      return 'View store';
    case 'product':
      return 'View product';
    case 'directory':
      return 'View business';
    case 'office':
      return 'Open My Office';
    case 'profile':
      return 'Open profile';
    default:
      return null;
  }
}

function parseList(raw: unknown): UserNotification[] {
  if (!Array.isArray(raw)) return [];
  const out: UserNotification[] = [];
  for (const row of raw) {
    if (row == null || typeof row !== 'object') continue;
    const o = row as Record<string, unknown>;
    const id = Number(o.id);
    if (!id) continue;
    const data =
      o.data != null && typeof o.data === 'object' && !Array.isArray(o.data)
        ? (o.data as Record<string, unknown>)
        : {};
    out.push({
      id,
      title: String(o.title ?? ''),
      body: String(o.body ?? ''),
      type: String(o.type ?? data.type ?? 'general'),
      data,
      is_read: o.is_read === true || o.is_read === 1,
      created_at: String(o.created_at ?? ''),
    });
  }
  return out;
}

export function NotificationsModal({ visible, onClose, onUnreadChange, onNavigate }: Props) {
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<UserNotification[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<UserNotification | null>(null);
  const hasMoreRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const itemsLenRef = useRef(0);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);
  useEffect(() => {
    itemsLenRef.current = items.length;
  }, [items.length]);

  const load = useCallback(
    async (mode: 'full' | 'more' = 'full') => {
      if (mode === 'more') {
        if (loadingMoreRef.current || !hasMoreRef.current) return;
        loadingMoreRef.current = true;
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setErr(null);
      try {
        const offset = mode === 'more' ? itemsLenRef.current : 0;
        const res = await apiGet(`user-notifications.php?limit=${PAGE_SIZE}&offset=${offset}`, true);
        if (!res.ok) {
          throw new Error(typeof res.error === 'string' ? res.error : 'Could not load notifications');
        }
        const list = parseList(res.notifications);
        const more = res.has_more === true;
        if (mode === 'more') {
          setItems((prev) => {
            const seen = new Set(prev.map((n) => n.id));
            const next = [...prev];
            for (const n of list) {
              if (!seen.has(n.id)) {
                seen.add(n.id);
                next.push(n);
              }
            }
            return next;
          });
        } else {
          setItems(list);
        }
        setHasMore(more);
        hasMoreRef.current = more;
        const unread = typeof res.unread_count === 'number' ? res.unread_count : 0;
        onUnreadChange?.(unread);
      } catch (e) {
        if (mode !== 'more') {
          setErr(e instanceof Error ? e.message : 'Could not load notifications');
          setItems([]);
          setHasMore(false);
          hasMoreRef.current = false;
        }
      } finally {
        if (mode === 'more') {
          loadingMoreRef.current = false;
          setLoadingMore(false);
        } else {
          setLoading(false);
        }
      }
    },
    [onUnreadChange]
  );

  useEffect(() => {
    if (!visible) {
      setSelected(null);
      return;
    }
    void load('full');
    void apiPost('user-notifications-read.php', {}, true)
      .then(() => {
        onUnreadChange?.(0);
        setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      })
      .catch(() => {
        /* non-fatal */
      });
  }, [visible, load, onUnreadChange]);

  const openDetail = (item: UserNotification) => {
    setSelected(item);
  };

  const goToTarget = (item: UserNotification) => {
    const target = resolveNotificationTarget(item);
    if (!target || !onNavigate) return;
    setSelected(null);
    onClose();
    // Let the sheet close before navigating.
    setTimeout(() => onNavigate(target), 80);
  };

  const selectedTarget = selected ? resolveNotificationTarget(selected) : null;
  const selectedAction = actionLabel(selectedTarget);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} accessibilityLabel="Dismiss" />
        <View style={styles.sheet}>
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
              <Pressable onPress={() => void load('full')} style={({ pressed }) => [styles.retryBtn, pressed && styles.pressed]}>
                <Text style={styles.retryText}>Try again</Text>
              </Pressable>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={40} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyHint}>Updates about messages, listings, and orders will appear here.</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              onEndReached={() => void load('more')}
              onEndReachedThreshold={0.35}
              ListFooterComponent={
                loadingMore ? (
                  <View style={styles.moreWrap}>
                    <ActivityIndicator color={colors.primary} />
                  </View>
                ) : hasMore ? (
                  <Text style={styles.moreHint}>Scroll for older notifications</Text>
                ) : items.length > 8 ? (
                  <Text style={styles.moreHint}>End of notifications</Text>
                ) : null
              }
              renderItem={({ item }) => {
                const target = resolveNotificationTarget(item);
                return (
                  <Pressable
                    onPress={() => openDetail(item)}
                    style={({ pressed }) => [styles.row, !item.is_read && styles.rowUnread, pressed && styles.pressed]}
                  >
                    <View style={styles.rowTop}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      {target ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
                    </View>
                    {item.body ? (
                      <Text style={styles.rowBody} numberOfLines={2}>
                        {item.body}
                      </Text>
                    ) : null}
                    <Text style={styles.rowWhen}>{formatWhen(item.created_at)}</Text>
                  </Pressable>
                );
              }}
            />
          )}
        </View>
      </View>

      <Modal visible={selected != null} animationType="fade" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.detailBackdrop}>
          <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setSelected(null)} />
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selected?.title}</Text>
              <Pressable
                onPress={() => setSelected(null)}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
                accessibilityLabel="Close notification"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>
            {selected?.created_at ? <Text style={styles.detailWhen}>{formatWhen(selected.created_at)}</Text> : null}
            <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollPad}>
              <Text style={styles.detailBody}>{selected?.body || 'No additional details.'}</Text>
            </ScrollView>
            <View style={styles.detailActions}>
              {selected && selectedAction && selectedTarget ? (
                <Pressable
                  onPress={() => goToTarget(selected)}
                  style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
                >
                  <Text style={styles.primaryBtnText}>{selectedAction}</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setSelected(null)}
                style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
              >
                <Text style={styles.secondaryBtnText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 10,
    height: '82%',
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
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
  center: { flex: 1, paddingVertical: 32, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errText: { color: colors.danger, textAlign: 'center', fontWeight: '600' },
  retryBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  retryText: { color: colors.primary, fontWeight: '700' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 36, paddingHorizontal: 12, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyHint: { fontSize: 13, lineHeight: 19, color: colors.textMuted, textAlign: 'center' },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  moreWrap: { paddingVertical: 16, alignItems: 'center' },
  moreHint: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    paddingVertical: 14,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 4,
  },
  rowUnread: { backgroundColor: 'rgba(37, 99, 235, 0.04)' },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  rowBody: { fontSize: 14, lineHeight: 20, color: colors.textMuted },
  rowWhen: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginTop: 2 },
  pressed: { opacity: 0.9 },
  detailBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    justifyContent: 'center',
    padding: 22,
  },
  detailCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 18,
    maxHeight: '80%',
  },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  detailTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, paddingTop: 4 },
  detailWhen: { marginTop: 6, fontSize: 12, fontWeight: '700', color: colors.textMuted },
  detailScroll: { marginTop: 12, maxHeight: 320 },
  detailScrollPad: { paddingBottom: 8 },
  detailBody: { fontSize: 15, lineHeight: 22, color: colors.text, fontWeight: '500' },
  detailActions: { marginTop: 16, gap: 10 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 15, fontWeight: '800', color: colors.white },
  secondaryBtn: {
    backgroundColor: 'rgba(11, 18, 32, 0.06)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '700', color: colors.text },
});

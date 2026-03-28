import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  apiGet,
  apiPost,
  apiSendMessage,
  apiSendMessageWithFile,
  downloadMessageAttachment,
} from '../api/client';
import { ChatAttachmentImage } from '../components/ChatAttachmentImage';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'SupportChat'>;

type Attachment = {
  id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
};

type Msg = {
  id: number;
  sender_user_id: number;
  body: string;
  created_at: string;
  mine: boolean;
  attachment?: Attachment | null;
};

type PendingFile = { uri: string; name: string; mime: string };

export function SupportChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const [conversationId, setConversationId] = useState<number | null>(route.params.conversationId ?? null);
  const [opening, setOpening] = useState(route.params.conversationId == null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [pendingFile, setPendingFile] = useState<PendingFile | null>(null);
  const [openingAttId, setOpeningAttId] = useState<number | null>(null);
  const [sendProgress, setSendProgress] = useState<number | null>(null);
  const [previewAttachmentId, setPreviewAttachmentId] = useState<number | null>(null);
  const listRef = useRef<FlatList<Msg>>(null);

  useEffect(() => {
    if (conversationId != null) {
      setOpening(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setOpening(true);
      try {
        const data = await apiPost('support-open-conversation.php', {}, true);
        const cid =
          typeof data.conversation_id === 'number' ? data.conversation_id : Number(data.conversation_id);
        if (!Number.isFinite(cid) || cid <= 0) {
          throw new Error('Could not open Customer Support chat');
        }
        if (!cancelled) {
          setConversationId(cid);
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert(
            'Customer Support',
            e instanceof Error ? e.message : 'Customer Support is unavailable. Try again later.'
          );
          navigation.goBack();
        }
      } finally {
        if (!cancelled) {
          setOpening(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, navigation]);

  const markRead = useCallback(
    async (cid: number) => {
      try {
        await apiPost('support-mark-read.php', { conversation_id: cid } as Record<string, unknown>, true);
      } catch {
        /* non-fatal */
      }
    },
    []
  );

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      const cid = conversationId;
      if (cid == null) return;
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGet(`messages.php?conversation_id=${cid}`, true);
        const M = data.messages;
        setMessages(Array.isArray(M) ? (M as Msg[]) : []);
      } catch {
        setMessages([]);
      } finally {
        if (mode === 'refresh') setRefreshing(false);
        else setLoading(false);
      }
    },
    [conversationId]
  );

  useFocusEffect(
    useCallback(() => {
      if (conversationId == null) {
        return;
      }
      void markRead(conversationId);
    }, [conversationId, markRead])
  );

  useFocusEffect(
    useCallback(() => {
      if (conversationId != null) {
        void load('full');
      }
    }, [conversationId, load])
  );

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Photos', 'Allow photo access to attach images for Customer Support.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });
      if (result.canceled) return;
      const a = result.assets[0];
      if (!a?.uri) return;
      const ext = a.mimeType?.includes('png') ? 'png' : a.mimeType?.includes('webp') ? 'webp' : 'jpg';
      setPendingFile({
        uri: a.uri,
        name: a.fileName || `photo.${ext}`,
        mime: a.mimeType || 'image/jpeg',
      });
    } catch (e) {
      Alert.alert('Photo', e instanceof Error ? e.message : 'Could not open gallery');
    }
  };

  const send = async () => {
    const cid = conversationId;
    const t = text.trim();
    if (cid == null || (!t && !pendingFile) || sending) return;
    setSending(true);
    setSendProgress(null);
    try {
      if (pendingFile) {
        setSendProgress(0);
        await apiSendMessageWithFile(cid, t, pendingFile, (p) => setSendProgress(p));
        setPendingFile(null);
        setSendProgress(null);
      } else {
        await apiSendMessage(cid, t);
      }
      setText('');
      await load('full');
    } catch (e) {
      Alert.alert('Send failed', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSendProgress(null);
      setSending(false);
    }
  };

  const openAttachment = async (att: Attachment) => {
    if (att.mime_type.startsWith('image/')) {
      setPreviewAttachmentId(att.id);
      return;
    }
    if (openingAttId != null) return;
    setOpeningAttId(att.id);
    try {
      await downloadMessageAttachment(att.id, att.file_name, att.mime_type);
    } catch (e) {
      Alert.alert('Download', e instanceof Error ? e.message : 'Could not download');
    } finally {
      setOpeningAttId(null);
    }
  };

  const canSend = text.trim().length > 0 || pendingFile != null;
  /** Root stack has no native header; offset = status bar + custom top bar (matches padded topBar). */
  const topBarPaddingTop = insets.top + 10;
  const keyboardVerticalOffset = topBarPaddingTop + 52;

  if (opening || conversationId == null) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['top', 'bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.openingHint}>Connecting to Customer Support…</Text>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        enabled
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <SafeAreaView style={styles.flex} edges={['bottom']}>
          <View style={[styles.topBar, { paddingTop: topBarPaddingTop }]}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={26} color={colors.primaryDark} />
            </Pressable>
            <Text style={styles.topTitle}>Customer Support</Text>
            <View style={styles.backBtn} />
          </View>
          <Modal
            visible={previewAttachmentId != null}
            transparent
            animationType="fade"
            onRequestClose={() => setPreviewAttachmentId(null)}
          >
            <Pressable style={styles.previewBackdrop} onPress={() => setPreviewAttachmentId(null)}>
              {previewAttachmentId != null ? (
                <View pointerEvents="none" style={styles.previewInner}>
                  <ChatAttachmentImage
                    attachmentId={previewAttachmentId}
                    contentFit="contain"
                    style={styles.previewImage}
                    accessibilityLabel="Full screen photo"
                  />
                </View>
              ) : null}
            </Pressable>
          </Modal>
          {loading && !refreshing ? (
            <View style={styles.centerGrow}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              style={styles.flex}
              data={messages}
              keyExtractor={(m) => String(m.id)}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => void load('refresh')}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => (
                <View style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {item.body.trim() !== '' ? (
                    <Text style={[styles.bubbleText, item.mine && styles.bubbleTextMine]}>{item.body}</Text>
                  ) : null}
                  {item.attachment ? (
                    item.attachment.mime_type.startsWith('image/') ? (
                      <ChatAttachmentImage
                        attachmentId={item.attachment.id}
                        style={styles.chatImageThumb}
                        onPress={() => void openAttachment(item.attachment!)}
                        accessibilityLabel={item.attachment.file_name}
                      />
                    ) : (
                      <Pressable
                        onPress={() => void openAttachment(item.attachment!)}
                        disabled={openingAttId === item.attachment.id}
                        style={({ pressed }) => [styles.attachBox, pressed && styles.attachBoxPressed]}
                      >
                        <Ionicons name="document-attach-outline" size={22} color={colors.primaryDark} />
                        <Text style={styles.attachName}>{item.attachment.file_name}</Text>
                      </Pressable>
                    )
                  ) : null}
                  <Text style={[styles.time, item.mine && styles.timeMine]}>
                    {item.created_at.slice(11, 16)}
                  </Text>
                </View>
              )}
            />
          )}
          <View style={styles.composer}>
            <Text style={styles.hint}>Write a message, or attach a photo (optional).</Text>
            {pendingFile ? (
              <View style={styles.pendingRow}>
                <Image source={{ uri: pendingFile.uri }} style={styles.pendingThumb} contentFit="cover" />
                <Text style={styles.pendingName} numberOfLines={1}>
                  {pendingFile.name}
                </Text>
                <Pressable onPress={() => setPendingFile(null)} hitSlop={12}>
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}
            <Pressable onPress={() => void pickImage()} style={styles.pickPhotoBtn} hitSlop={8}>
              <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
              <Text style={styles.pickPhotoText}>Attach photo (optional)</Text>
            </Pressable>
            <TextInput
              style={styles.input}
              placeholder="Message to Customer Support…"
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
            {sendProgress != null ? (
              <Text style={styles.sendProgress}>Sending… {sendProgress}%</Text>
            ) : null}
            <PrimaryButton
              label={sending ? '…' : 'Send to Customer Support'}
              onPress={() => void send()}
              disabled={!canSend}
              loading={sending}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerGrow: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  openingHint: { marginTop: 12, fontSize: 14, color: colors.textMuted, fontWeight: '600' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11,18,32,0.1)',
    backgroundColor: colors.white,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  list: { padding: 16, paddingBottom: 8 },
  bubble: {
    maxWidth: '88%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.08)',
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(31, 170, 242, 0.18)',
    borderColor: 'rgba(31, 170, 242, 0.35)',
  },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.card },
  bubbleText: { fontSize: 15, color: colors.text, fontWeight: '500' },
  bubbleTextMine: { color: colors.text },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  attachBoxPressed: { opacity: 0.9 },
  attachName: { fontSize: 14, fontWeight: '700', color: colors.text },
  chatImageThumb: {
    marginTop: 8,
    width: 220,
    maxWidth: '100%',
    height: 220,
    borderRadius: 14,
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
  },
  previewInner: { flex: 1, width: '100%', paddingVertical: 48 },
  previewImage: { flex: 1, width: '100%' },
  sendProgress: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  time: { fontSize: 10, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
  timeMine: { textAlign: 'right' },
  composer: {
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11,18,32,0.1)',
    backgroundColor: colors.white,
    gap: 10,
  },
  hint: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  pendingThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(11,18,32,0.08)' },
  pendingName: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.35)',
  },
  pickPhotoText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  input: {
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
});

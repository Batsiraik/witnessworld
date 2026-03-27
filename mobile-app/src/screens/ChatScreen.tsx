import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useRef, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  apiGet,
  apiSendMessage,
  apiSendMessageWithFile,
  downloadMessageAttachment,
} from '../api/client';
import { ChatAttachmentImage } from '../components/ChatAttachmentImage';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import type { InboxStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<InboxStackParamList, 'Chat'>;

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

export function ChatScreen({ route }: Props) {
  const { conversationId, peerName } = route.params;
  const headerHeight = useHeaderHeight();
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

  const load = useCallback(
    async (mode: 'full' | 'refresh' = 'full') => {
      if (mode === 'refresh') setRefreshing(true);
      else setLoading(true);
      try {
        const data = await apiGet(`messages.php?conversation_id=${conversationId}`, true);
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
      void load('full');
    }, [load])
  );

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const a = result.assets[0];
      if (!a?.uri) return;
      setPendingFile({
        uri: a.uri,
        name: a.name || 'document',
        mime: a.mimeType || 'application/octet-stream',
      });
    } catch (e) {
      Alert.alert('Attachment', e instanceof Error ? e.message : 'Could not open file picker');
    }
  };

  const pickImage = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Photos', 'Allow photo access to send pictures.');
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
    const t = text.trim();
    if ((!t && !pendingFile) || sending) return;
    setSending(true);
    setSendProgress(null);
    try {
      if (pendingFile) {
        setSendProgress(0);
        await apiSendMessageWithFile(conversationId, t, pendingFile, (p) => setSendProgress(p));
        setPendingFile(null);
        setSendProgress(null);
      } else {
        await apiSendMessage(conversationId, t);
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

  const keyboardVerticalOffset = headerHeight;

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
        enabled
        keyboardVerticalOffset={keyboardVerticalOffset}
      >
        <SafeAreaView style={styles.flex} edges={['bottom']}>
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
            <View style={styles.center}>
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
                        <View style={styles.attachTextWrap}>
                          <Text style={styles.attachName} numberOfLines={2}>
                            {item.attachment.file_name}
                          </Text>
                          <Text style={styles.attachHint}>
                            {openingAttId === item.attachment.id ? 'Preparing…' : 'Tap to save or open'}
                          </Text>
                        </View>
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
            {pendingFile ? (
              <View style={styles.pendingRow}>
                {pendingFile.mime.startsWith('image/') ? (
                  <Image source={{ uri: pendingFile.uri }} style={styles.pendingThumb} contentFit="cover" />
                ) : null}
                <Text style={styles.pendingName} numberOfLines={1}>
                  {pendingFile.name}
                </Text>
                <Pressable onPress={() => setPendingFile(null)} hitSlop={12}>
                  <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                </Pressable>
              </View>
            ) : null}
            <View style={styles.attachBar}>
              <Pressable onPress={() => void pickImage()} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="image-outline" size={26} color={colors.primaryDark} />
              </Pressable>
              <Pressable onPress={() => void pickDocument()} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="attach-outline" size={26} color={colors.primaryDark} />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder={peerName ? `Message ${peerName}…` : 'Type a message…'}
              placeholderTextColor={colors.textMuted}
              value={text}
              onChangeText={setText}
              multiline
              textAlignVertical="top"
            />
            {sendProgress != null ? (
              <Text style={styles.sendProgress}>Sending file… {sendProgress}%</Text>
            ) : null}
            <PrimaryButton
              label={sending ? '…' : 'Send'}
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
    borderWidth: 1,
    borderColor: 'rgba(11,18,32,0.08)',
  },
  attachBoxPressed: { opacity: 0.9 },
  attachTextWrap: { flex: 1, minWidth: 0 },
  attachName: { fontSize: 14, fontWeight: '700', color: colors.text },
  attachHint: { fontSize: 11, color: colors.textMuted, marginTop: 4, fontWeight: '600' },
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
  attachBar: { flexDirection: 'row', gap: 4 },
  iconBtn: { padding: 4 },
  input: {
    minHeight: 44,
    maxHeight: 120,
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

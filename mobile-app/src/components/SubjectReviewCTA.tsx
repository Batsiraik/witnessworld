import { useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiPost } from '../api/client';
import { PrimaryButton } from './PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import { colors } from '../theme/colors';

export type ReviewSubjectType = 'listing' | 'store' | 'product' | 'directory_entry' | 'member';

type SheetProps = {
  visible: boolean;
  onClose: () => void;
  subjectType: ReviewSubjectType;
  subjectId: number;
  subjectTitle: string;
  onPosted: () => void;
};

function SubjectReviewSheet({ visible, onClose, subjectType, subjectId, subjectTitle, onPosted }: SheetProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!body.trim()) {
      Alert.alert('Review required', 'Please write a short review.');
      return;
    }
    setBusy(true);
    try {
      await apiPost(
        'content-review-subject-create.php',
        {
          subject_type: subjectType,
          subject_id: subjectId,
          rating,
          title: title.trim(),
          body: body.trim(),
        },
        true
      );
      Alert.alert('Thanks', 'Your review was posted.');
      setTitle('');
      setBody('');
      setRating(5);
      onClose();
      onPosted();
    } catch (e) {
      Alert.alert('Could not post', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Review</Text>
          <Text style={styles.sheetSub} numberOfLines={2}>
            {subjectTitle}
          </Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={8}>
                <Text style={[styles.starPick, n <= rating && styles.starPickOn]}>★</Text>
              </Pressable>
            ))}
          </View>
          <TextInput value={title} onChangeText={setTitle} placeholder="Title (optional)" style={styles.input} />
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="How was your experience? (You can review even if you booked outside the app.)"
            multiline
            style={[styles.input, styles.textArea]}
          />
          <View style={styles.row}>
            <Pressable onPress={onClose} style={[styles.btn, styles.muted]}>
              <Text style={styles.mutedText}>Close</Text>
            </Pressable>
            <PrimaryButton label="Post review" onPress={() => void submit()} loading={busy} style={styles.submit} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

type CtaProps = {
  subjectType: ReviewSubjectType;
  subjectId: number;
  sellerUserId: number;
  subjectTitle: string;
  onPosted: () => void;
};

export function SubjectReviewCTA({ subjectType, subjectId, sellerUserId, subjectTitle, onPosted }: CtaProps) {
  const { user, isGuest, showGuestPrompt } = useDashboardContext();
  const [open, setOpen] = useState(false);
  const myId = user?.id ?? 0;

  if (sellerUserId === myId) return null;

  return (
    <>
      <PrimaryButton
        label="Add a review"
        variant="outline"
        onPress={() => {
          if (isGuest) showGuestPrompt();
          else setOpen(true);
        }}
        style={styles.cta}
      />
      <SubjectReviewSheet
        visible={open}
        onClose={() => setOpen(false)}
        subjectType={subjectType}
        subjectId={subjectId}
        subjectTitle={subjectTitle}
        onPosted={onPosted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  cta: { marginTop: 12 },
  backdrop: { flex: 1, backgroundColor: 'rgba(11,18,32,0.48)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.white, borderRadius: 22, padding: 18 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetSub: { marginTop: 6, fontSize: 14, fontWeight: '600', color: colors.textMuted },
  starRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 4 },
  starPick: { fontSize: 30, color: 'rgba(11,18,32,0.16)' },
  starPickOn: { color: colors.gold },
  input: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  btn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  muted: { backgroundColor: 'rgba(11, 18, 32, 0.06)' },
  mutedText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  submit: { flex: 1 },
});

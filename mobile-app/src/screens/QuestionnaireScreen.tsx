import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost } from '../api/client';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Q = { id: number; question_text: string; sort_order: number };

type Props = NativeStackScreenProps<RootStackParamList, 'Questionnaire'>;

export function QuestionnaireScreen({ navigation }: Props) {
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await apiGet('questionnaire-questions.php', true);
      const list = (data.questions as Q[]) || [];
      setQuestions(list);
      const next: Record<number, string> = {};
      list.forEach((q) => {
        next[q.id] = '';
      });
      setAnswers(next);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load questions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    const payload = questions.map((q) => ({
      question_id: q.id,
      answer_text: (answers[q.id] || '').trim(),
    }));
    const missing = payload.some((p) => p.answer_text === '');
    if (missing) {
      Alert.alert('Questionnaire', 'Please answer every question.');
      return;
    }
    setSubmitting(true);
    try {
      await apiPost('questionnaire-submit.php', { answers: payload }, true);
      navigation.reset({ index: 0, routes: [{ name: 'Dashboard' }] });
    } catch (e) {
      Alert.alert('Questionnaire', e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <ScreenHeader
          title="Questionnaire"
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator
          >
            <Text style={styles.intro}>
              Answer a few questions so our team can review your profile. You’ll be able to use the app fully
              after approval.
            </Text>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator size="large" color={colors.primary} />
              </View>
            ) : loadError ? (
              <Text style={styles.err}>{loadError}</Text>
            ) : questions.length === 0 ? (
              <Text style={styles.err}>No questions are configured yet. Please try again later.</Text>
            ) : (
              <GlassCard>
                {questions.map((q) => (
                  <View key={q.id} style={styles.block}>
                    <Text style={styles.q}>{q.question_text}</Text>
                    <TextInput
                      value={answers[q.id] ?? ''}
                      onChangeText={(t) => setAnswers((prev) => ({ ...prev, [q.id]: t }))}
                      placeholder="Your answer"
                      placeholderTextColor={colors.textMuted}
                      multiline
                      style={styles.input}
                    />
                  </View>
                ))}
                <PrimaryButton label="Submit" onPress={submit} loading={submitting} />
              </GlassCard>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  flex: { flex: 1 },
  scroll: { paddingBottom: 40 },
  intro: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 16,
    fontWeight: '500',
  },
  center: { paddingVertical: 40, alignItems: 'center' },
  err: { color: colors.danger, fontSize: 14, fontWeight: '600' },
  block: { marginBottom: 18 },
  q: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.25)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
});

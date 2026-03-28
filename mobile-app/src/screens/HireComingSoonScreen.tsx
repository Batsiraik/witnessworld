import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'HireComingSoon'>;

export function HireComingSoonScreen({ route }: Props) {
  const u = route.params?.username?.trim();
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.box}>
          <Text style={styles.title}>Still under development</Text>
          <Text style={styles.body}>
            {u
              ? `Hiring ${u} and the full hire flow are not ready yet. We are still working on this experience — check back soon.`
              : 'The hire flow is not ready yet. We are still working on this experience — check back soon.'}
          </Text>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  box: { flex: 1, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 14 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.textMuted },
});

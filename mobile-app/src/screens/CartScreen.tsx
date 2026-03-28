import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '../components/GradientBackground';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'Cart'>;

export function CartScreen(_: Props) {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.box}>
          <Text style={styles.title}>Cart — coming soon</Text>
          <Text style={styles.body}>
            Checkout and order management are not ready yet. We are still building this flow; you will be able to review items and complete purchases here soon.
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

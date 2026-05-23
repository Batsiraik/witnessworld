import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

/** Solid brand-blue pill — white label (reference: “New for you” style). */
export function FeaturedBadge() {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>Featured</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.primary,
  },
  text: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
});

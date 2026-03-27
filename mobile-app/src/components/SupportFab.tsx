import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardContext } from '../context/DashboardContext';
import { colors } from '../theme/colors';

/** Blue chat bubble — sits just above the bottom tab bar. */
export function SupportFab() {
  const insets = useSafeAreaInsets();
  const { stackNavigation, supportAvailable } = useDashboardContext();

  if (!supportAvailable) {
    return null;
  }

  const bottom = 56 + Math.max(insets.bottom, 8) + 8;

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom }]}>
      <Pressable
        accessibilityLabel="Message Customer Support"
        onPress={() => stackNavigation.navigate('SupportChat', {})}
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
      >
        <Ionicons name="chatbubbles" size={26} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: 18,
    zIndex: 40,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabPressed: { opacity: 0.92 },
});

import type { NavigationState } from '@react-navigation/native';
import { useNavigationState } from '@react-navigation/native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDashboardContext } from '../context/DashboardContext';
import { useShoppingCart } from '../context/ShoppingCartContext';
import { colors } from '../theme/colors';

const TAB_BAR_BASE = 56;

function leafRouteName(state: NavigationState | undefined): string | undefined {
  if (!state?.routes?.length) return undefined;
  const r = state.routes[state.index];
  if (r.state) return leafRouteName(r.state as NavigationState);
  return r.name;
}

function formatMoney(amount: number, currency: string): string {
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur }).format(amount);
  } catch {
    return `${cur} ${amount.toFixed(2)}`;
  }
}

export function CartFloatingBar() {
  const insets = useSafeAreaInsets();
  const { stackNavigation, isGuest } = useDashboardContext();
  const { unitCount, subtotals, ready } = useShoppingCart();
  const focusedLeaf = useNavigationState((s) => leafRouteName(s as NavigationState));

  if (!ready || isGuest || unitCount <= 0) return null;
  if (focusedLeaf === 'Cart' || focusedLeaf === 'CartCheckout') return null;

  const bottom = TAB_BAR_BASE + Math.max(insets.bottom, 10) + 8;
  const entries = Object.entries(subtotals).filter(([, v]) => v > 0);
  const summary =
    entries.length === 0
      ? `${unitCount} item${unitCount === 1 ? '' : 's'}`
      : entries.map(([c, v]) => formatMoney(v, c)).join(' · ');

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Proceed to cart"
        onPress={() =>
          stackNavigation.navigate('Dashboard', {
            screen: 'HomeTab',
            params: { screen: 'Cart' },
          })
        }
        style={({ pressed }) => [styles.bar, pressed && styles.pressed]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Proceed to cart</Text>
          <Text style={styles.sub} numberOfLines={1}>
            {unitCount} item{unitCount === 1 ? '' : 's'} · {summary}
          </Text>
        </View>
        <Text style={styles.chev}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryDark,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { opacity: 0.92 },
  title: { color: colors.white, fontSize: 16, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.88)', fontSize: 13, fontWeight: '600', marginTop: 2 },
  chev: { color: colors.white, fontSize: 22, fontWeight: '300', marginLeft: 8 },
});

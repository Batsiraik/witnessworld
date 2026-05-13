import { StyleSheet } from 'react-native';
import { colors } from './colors';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  cardTitle: { fontSize: 14, lineHeight: 18, fontWeight: '800' as const, color: colors.text },
  caption: { fontSize: 12, fontWeight: '600' as const, color: colors.textMuted },
  meta: { fontSize: 11, fontWeight: '600' as const, color: colors.textMuted },
  price: { fontSize: 15, fontWeight: '800' as const, color: colors.primaryDark },
  accent: { fontSize: 12, fontWeight: '800' as const, color: colors.goldDark },
} as const;

export const shadows = StyleSheet.create({
  shopCard: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 5,
  },
  floating: {
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
    elevation: 8,
  },
});

export const surfaces = StyleSheet.create({
  shopCard: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 0,
    ...shadows.shopCard,
  },
  filterControl: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    borderRadius: radii.md,
    backgroundColor: colors.white,
  },
  thinDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.line,
  },
  goldChip: {
    borderRadius: radii.pill,
    backgroundColor: colors.goldSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(200, 162, 74, 0.42)',
  },
});


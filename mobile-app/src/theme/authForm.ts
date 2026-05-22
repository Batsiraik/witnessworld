import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { radii, spacing } from './designSystem';

/** Shared auth / signup field specs (48dp+ touch, clear focus, solid surfaces). */
export const authForm = {
  fieldMinHeight: 52,
  label: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: colors.textMuted,
    letterSpacing: 0.4,
    marginBottom: 6,
    textTransform: 'uppercase' as const,
  },
  hint: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontWeight: '500' as const,
    marginTop: -10,
    marginBottom: 12,
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text,
    minHeight: 52,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(31, 170, 242, 0.04)',
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(220, 38, 38, 0.03)',
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600' as const,
  },
  fieldGap: spacing.lg,
};

export const authFormStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  introWrap: { marginBottom: spacing.xl, paddingHorizontal: 4 },
  introTitle: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  introSub: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    fontWeight: '500',
  },
  section: { marginTop: spacing.sm, marginBottom: spacing.md },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
  },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.8 },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: spacing.lg,
    marginTop: -8,
  },
  row2: { flexDirection: 'row', gap: spacing.md },
  row2Cell: { flex: 1, minWidth: 0 },
  footerNote: {
    marginTop: spacing.lg,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  linkBtn: { alignSelf: 'flex-end', marginTop: -6, marginBottom: spacing.lg, paddingVertical: 4 },
  linkBtnText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
});

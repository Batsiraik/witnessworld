import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
  /** When true, only the input is rendered (e.g. inline next to dial picker) */
  hideLabel?: boolean;
};

export function AppTextField({ label, error, style, hideLabel, ...rest }: Props) {
  return (
    <View style={[styles.wrap, hideLabel && styles.wrapDense]}>
      {hideLabel ? null : <Text style={styles.label}>{label}</Text>}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? styles.inputError : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  wrapDense: { marginBottom: 0, flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.25)',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  inputError: { borderColor: colors.danger },
  error: { marginTop: 6, fontSize: 12, color: colors.danger, fontWeight: '500' },
});

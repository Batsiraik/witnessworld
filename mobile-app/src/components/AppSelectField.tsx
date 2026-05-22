import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { authForm, authFormStyles } from '../theme/authForm';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  value: string;
  placeholder?: string;
  onPress: () => void;
  error?: string;
  hint?: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function AppSelectField({
  label,
  value,
  placeholder = 'Select',
  onPress,
  error,
  hint,
  icon = 'chevron-down',
}: Props) {
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.wrap}>
      <Text style={authForm.label}>{label}</Text>
      {hint ? <Text style={[authForm.hint, styles.hintTop]}>{hint}</Text> : null}
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.row,
          error ? authForm.inputError : null,
          pressed && styles.pressed,
        ]}
      >
        {icon === 'chevron-down' ? null : (
          <Ionicons name={icon} size={20} color={colors.primaryDark} style={styles.leadingIcon} />
        )}
        <Text style={[styles.value, !hasValue && styles.placeholder]} numberOfLines={1}>
          {hasValue ? value : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </Pressable>
      {error ? <Text style={authForm.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: authForm.fieldGap },
  hintTop: { marginTop: 0, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: authForm.fieldMinHeight,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
  },
  pressed: { opacity: 0.92, backgroundColor: 'rgba(31, 170, 242, 0.04)' },
  leadingIcon: { marginRight: 10 },
  value: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text, paddingRight: 8 },
  placeholder: { color: colors.textMuted, fontWeight: '500' },
});

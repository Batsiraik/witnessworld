import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { authForm } from '../theme/authForm';
import { colors } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
};

export const AppPasswordField = forwardRef<TextInput, Props>(function AppPasswordField(
  { label, error, hint, style, onFocus, onBlur, ...rest },
  ref
) {
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={authForm.label}>{label}</Text>
      {hint ? <Text style={[authForm.hint, styles.hintTop]}>{hint}</Text> : null}
      <View
        style={[
          styles.row,
          focused && !error ? authForm.inputFocused : null,
          error ? authForm.inputError : null,
        ]}
      >
        <Ionicons name="lock-closed-outline" size={20} color={colors.primaryDark} style={styles.leftIcon} />
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!visible}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        <Pressable
          onPress={() => setVisible((v) => !v)}
          style={styles.eye}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.textMuted}
          />
        </Pressable>
      </View>
      {error ? <Text style={authForm.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: authForm.fieldGap },
  hintTop: { marginTop: 0, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    minHeight: authForm.fieldMinHeight,
  },
  leftIcon: { marginLeft: 14 },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    minHeight: authForm.fieldMinHeight,
  },
  eye: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});

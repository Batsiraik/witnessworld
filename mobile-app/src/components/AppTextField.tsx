import { Ionicons } from '@expo/vector-icons';
import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
} from 'react-native';
import { authForm } from '../theme/authForm';
import { colors } from '../theme/colors';

type Props = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  hideLabel?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  inputStyle?: StyleProp<TextStyle>;
};

export const AppTextField = forwardRef<TextInput, Props>(function AppTextField(
  { label, error, hint, style, hideLabel, leftIcon, inputStyle, onFocus, onBlur, ...rest },
  ref
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, hideLabel && styles.wrapDense]}>
      {hideLabel ? null : <Text style={authForm.label}>{label}</Text>}
      {hint && !hideLabel ? <Text style={[authForm.hint, styles.hintTop]}>{hint}</Text> : null}
      <View
        style={[
          styles.inputRow,
          focused && !error ? authForm.inputFocused : null,
          error ? authForm.inputError : null,
        ]}
      >
        {leftIcon ? (
          <Ionicons name={leftIcon} size={20} color={colors.primaryDark} style={styles.leftIcon} />
        ) : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, inputStyle, style]}
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
      </View>
      {error ? <Text style={authForm.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: authForm.fieldGap },
  wrapDense: { marginBottom: 0, flex: 1 },
  hintTop: { marginTop: 0, marginBottom: 8 },
  inputRow: {
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
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    minHeight: authForm.fieldMinHeight,
  },
});

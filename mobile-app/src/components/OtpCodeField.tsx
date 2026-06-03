import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { authForm } from '../theme/authForm';
import { colors } from '../theme/colors';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  length?: number;
};

export function OtpCodeField({ label, value, onChangeText, error, length = 6 }: Props) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(blink, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [blink]);

  const digits = value.replace(/\D/g, '').slice(0, length);

  return (
    <View style={styles.wrap}>
      <Text style={authForm.label}>{label}</Text>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[
          styles.row,
          focused && !error ? authForm.inputFocused : null,
          error ? authForm.inputError : null,
        ]}
        accessibilityRole="none"
        accessibilityLabel={label}
      >
        {Array.from({ length }, (_, i) => {
          const char = digits[i] ?? '';
          const isActive = focused && digits.length === i;
          return (
            <View key={i} style={[styles.box, isActive && styles.boxActive]}>
              {char ? (
                <Text style={styles.digit}>{char}</Text>
              ) : isActive ? (
                <Animated.View style={[styles.cursor, { opacity: blink }]} />
              ) : (
                <Text style={styles.placeholder}>0</Text>
              )}
            </View>
          );
        })}
        <TextInput
          ref={inputRef}
          value={digits}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          caretHidden
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          style={styles.hiddenInput}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      {error ? <Text style={authForm.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: authForm.fieldGap },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    minHeight: authForm.fieldMinHeight,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  box: {
    flex: 1,
    maxWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11, 18, 32, 0.03)',
  },
  boxActive: {
    backgroundColor: 'rgba(31, 170, 242, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.35)',
  },
  digit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  placeholder: {
    fontSize: 22,
    fontWeight: '700',
    color: 'rgba(92, 107, 122, 0.35)',
  },
  cursor: {
    width: 2,
    height: 24,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  hiddenInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
});

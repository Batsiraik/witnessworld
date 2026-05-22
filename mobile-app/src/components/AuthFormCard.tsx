import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { authFormStyles } from '../theme/authForm';

type Props = { children: ReactNode; style?: StyleProp<ViewStyle> };

export function AuthFormCard({ children, style }: Props) {
  return <View style={[authFormStyles.card, style]}>{children}</View>;
}

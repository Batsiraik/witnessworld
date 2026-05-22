import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { authFormStyles } from '../theme/authForm';

type Props = {
  title: string;
  hint?: string;
  children: ReactNode;
};

export function AuthFormSection({ title, hint, children }: Props) {
  return (
    <View style={authFormStyles.section}>
      <View style={authFormStyles.sectionHead}>
        <Text style={authFormStyles.sectionTitle}>{title}</Text>
        <View style={authFormStyles.sectionLine} />
      </View>
      {hint ? <Text style={authFormStyles.sectionHint}>{hint}</Text> : null}
      {children}
    </View>
  );
}

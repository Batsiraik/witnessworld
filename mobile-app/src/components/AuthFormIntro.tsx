import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { authFormStyles } from '../theme/authForm';

const LOGO = require('../../assets/logo.jpg');

type Props = {
  title: string;
  subtitle: string;
  showLogo?: boolean;
};

export function AuthFormIntro({ title, subtitle, showLogo = true }: Props) {
  return (
    <View style={authFormStyles.introWrap}>
      {showLogo ? (
        <View style={styles.logoWrap}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="WWC logo" />
        </View>
      ) : null}
      <Text style={authFormStyles.introTitle}>{title}</Text>
      <Text style={authFormStyles.introSub}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.line,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  logo: { width: 44, height: 44, borderRadius: 12 },
});

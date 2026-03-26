import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../components/PrimaryButton';
import { GradientBackground } from '../components/GradientBackground';
import type { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const LOGO = require('../../assets/logo.jpg');

type Props = NativeStackScreenProps<RootStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <View style={styles.logoWrap}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Witness World Connect logo" />
          </View>
          <Text style={styles.brand}>Witness World Connect</Text>
          <Text style={styles.tagline}>
            Connect, Share, and Grow with Friends Worldwide.
          </Text>
          <Text style={styles.subtext}>
            A trusted platform designed for friends to connect, access services, and support one
            another. Whether you’re looking for local services, business opportunities, or helpful
            resources, we make it simple and secure to find exactly what you need.
          </Text>
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="Log in" onPress={() => navigation.navigate('Login')} />
          <View style={styles.gap} />
          <PrimaryButton
            label="Create account"
            variant="outline"
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 24 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoWrap: {
    width: 132,
    height: 132,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 28,
    elevation: 10,
    marginBottom: 20,
  },
  logo: { width: 108, height: 108, borderRadius: 28 },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 17,
    lineHeight: 26,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
    maxWidth: 320,
  },
  subtext: {
    marginTop: 14,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '400',
    maxWidth: 340,
    opacity: 0.92,
  },
  actions: { paddingBottom: 12 },
  gap: { height: 14 },
});

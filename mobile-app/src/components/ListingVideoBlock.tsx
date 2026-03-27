import Constants from 'expo-constants';
import { Linking, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { REMOTE_MEDIA_HEADERS } from '../utils/mediaUrl';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

type Props = {
  uri: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Listing clip: full player in dev builds / APK; Expo Go has no ExponentAV — open in browser instead.
 */
export function ListingVideoBlock({ uri, style }: Props) {
  if (isExpoGo()) {
    return (
      <View style={[style, styles.fallback]}>
        <Text style={styles.fallbackSub}>
          Expo Go doesn’t include the video player. Use a development build or APK to watch here, or open in
          your browser.
        </Text>
        <Pressable
          onPress={() => void Linking.openURL(uri)}
          style={({ pressed }) => [styles.openBtn, pressed && styles.openBtnPressed]}
        >
          <Text style={styles.openBtnText}>Open video</Text>
        </Pressable>
      </View>
    );
  }

  try {
    const { ResizeMode, Video } = require('expo-av') as typeof import('expo-av');
    return (
      <Video
        source={{ uri, headers: REMOTE_MEDIA_HEADERS }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={style}
        shouldPlay={false}
      />
    );
  } catch {
    return (
      <View style={[style, styles.fallback]}>
        <Text style={styles.fallbackSub}>Video unavailable in this build.</Text>
        <Pressable onPress={() => void Linking.openURL(uri)} style={styles.openBtn}>
          <Text style={styles.openBtnText}>Open video</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  fallback: {
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  fallbackSub: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.75)',
    lineHeight: 20,
    marginBottom: 12,
  },
  openBtn: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  openBtnPressed: { opacity: 0.9 },
  openBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

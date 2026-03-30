import { useIsFocused } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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
 * Marketplace listing video: `expo-video` (official replacement for expo-av Video).
 * Pauses when the screen loses focus so back navigation tears down a quiet player.
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

  return <ListingVideoBody key={uri} uri={uri} style={style} />;
}

function ListingVideoBody({ uri, style }: Props) {
  const isFocused = useIsFocused();
  const player = useVideoPlayer(
    { uri, headers: REMOTE_MEDIA_HEADERS },
    (p) => {
      p.loop = false;
    }
  );

  useEffect(() => {
    if (!isFocused) {
      player.pause();
    }
  }, [isFocused, player]);

  return (
    <View style={[styles.wrap, style]} collapsable={false}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls
        contentFit="contain"
        fullscreenOptions={{ enable: true, orientation: 'default' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
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

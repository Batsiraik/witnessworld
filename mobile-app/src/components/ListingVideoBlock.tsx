import Constants from 'expo-constants';
import type { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
 * Listing clip: custom controls + in-app modal "fullscreen".
 * Native Android fullscreen (ExoPlayer) crashes with portrait-only apps / RN Screens; we avoid useNativeControls.
 */
export function ListingVideoBlock({ uri, style }: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!modalOpen) return undefined;
    RNStatusBar.setHidden(true, 'fade');
    return () => {
      RNStatusBar.setHidden(false, 'fade');
    };
  }, [modalOpen]);

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
    return (
      <>
        <InlineListingVideo uri={uri} style={style} onOpenFullscreen={() => setModalOpen(true)} />
        <Modal
          visible={modalOpen}
          animationType="fade"
          presentationStyle="fullScreen"
          supportedOrientations={['portrait']}
          onRequestClose={() => setModalOpen(false)}
        >
          <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
            <Pressable
              onPress={() => setModalOpen(false)}
              style={({ pressed }) => [styles.modalClose, pressed && styles.modalClosePressed]}
              hitSlop={16}
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen video"
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <FullscreenListingVideo uri={uri} />
          </SafeAreaView>
        </Modal>
      </>
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

function InlineListingVideo({
  uri,
  style,
  onOpenFullscreen,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
  onOpenFullscreen: () => void;
}) {
  const { ResizeMode, Video } = require('expo-av') as typeof import('expo-av');
  const videoRef = useRef<Video | null>(null);
  const [showPlayHint, setShowPlayHint] = useState(true);

  useEffect(() => {
    return () => {
      void videoRef.current?.unloadAsync?.().catch(() => {
        /* ignore */
      });
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    const st = await v.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) {
      await v.pauseAsync();
    } else {
      await v.playAsync();
    }
  }, []);

  return (
    <View style={[style, styles.inlineWrap]}>
      <Video
        ref={videoRef}
        source={{ uri, headers: REMOTE_MEDIA_HEADERS }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(s) => {
          if (s.isLoaded) {
            setShowPlayHint(!s.isPlaying);
          }
        }}
      />
      <Pressable
        style={styles.tapLayer}
        onPress={() => void togglePlayback()}
        accessibilityRole="button"
        accessibilityLabel="Play or pause video"
      />
      {showPlayHint ? (
        <View style={styles.playHint} pointerEvents="none">
          <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}
      <Pressable
        onPress={() => onOpenFullscreen()}
        style={({ pressed }) => [styles.expandPill, pressed && styles.expandPillPressed]}
        accessibilityRole="button"
        accessibilityLabel="Open larger video view"
      >
        <Ionicons name="expand-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.expandPillText}>Larger view</Text>
      </Pressable>
    </View>
  );
}

function FullscreenListingVideo({ uri }: { uri: string }) {
  const { ResizeMode, Video } = require('expo-av') as typeof import('expo-av');
  const videoRef = useRef<Video | null>(null);
  const [showPlayHint, setShowPlayHint] = useState(true);

  useEffect(() => {
    return () => {
      void videoRef.current?.unloadAsync?.().catch(() => {
        /* ignore */
      });
    };
  }, []);

  const togglePlayback = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    const st = await v.getStatusAsync();
    if (!st.isLoaded) return;
    if (st.isPlaying) {
      await v.pauseAsync();
    } else {
      await v.playAsync();
    }
  }, []);

  return (
    <View style={styles.fullscreenStage}>
      <Video
        ref={videoRef}
        source={{ uri, headers: REMOTE_MEDIA_HEADERS }}
        style={StyleSheet.absoluteFill}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
        isLooping={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={(s) => {
          if (s.isLoaded) {
            setShowPlayHint(!s.isPlaying);
          }
        }}
      />
      <Pressable
        style={styles.tapLayer}
        onPress={() => void togglePlayback()}
        accessibilityRole="button"
        accessibilityLabel="Play or pause video"
      />
      {showPlayHint ? (
        <View style={styles.playHint} pointerEvents="none">
          <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
        </View>
      ) : null}
      <Text style={styles.fullscreenHint}>Tap video to play or pause · X above to close</Text>
    </View>
  );
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

  inlineWrap: {
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  tapLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  playHint: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expandPill: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.45)',
  },
  expandPillPressed: { opacity: 0.9 },
  expandPillText: { fontSize: 13, fontWeight: '800', color: colors.primaryDark },

  modalRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalClose: {
    alignSelf: 'flex-end',
    marginRight: 8,
    marginBottom: 8,
    padding: 8,
    zIndex: 10,
  },
  modalClosePressed: { opacity: 0.85 },
  fullscreenStage: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullscreenHint: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    zIndex: 2,
  },
});

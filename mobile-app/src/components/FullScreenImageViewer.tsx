import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { RemoteImage } from './RemoteImage';

const SCREEN_W = Dimensions.get('window').width;
const SCREEN_H = Dimensions.get('window').height;

type Props = {
  visible: boolean;
  urls: string[];
  initialIndex?: number;
  onClose: () => void;
};

export function FullScreenImageViewer({ visible, urls, initialIndex = 0, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!visible || urls.length === 0) return;
    const i = Math.min(Math.max(initialIndex, 0), urls.length - 1);
    setIndex(i);
    const t = setTimeout(() => {
      listRef.current?.scrollToIndex({ index: i, animated: false });
    }, 0);
    return () => clearTimeout(t);
  }, [visible, initialIndex, urls]);

  if (urls.length === 0) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
    setIndex(Math.min(Math.max(i, 0), urls.length - 1));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <FlatList
          ref={listRef}
          data={urls}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${u}-${i}`}
          initialScrollIndex={Math.min(Math.max(initialIndex, 0), urls.length - 1)}
          getItemLayout={(_, i) => ({ length: SCREEN_W, offset: SCREEN_W * i, index: i })}
          onMomentumScrollEnd={onScrollEnd}
          onScrollToIndexFailed={() => {
            /* FlatList may not be measured yet — safe to ignore */
          }}
          renderItem={({ item }) => (
            <Pressable style={styles.slide} onPress={onClose}>
              <RemoteImage url={item} style={styles.image} contentFit="contain" />
            </Pressable>
          )}
        />
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close full screen photo"
        >
          <Ionicons name="close" size={26} color={colors.white} />
        </Pressable>
        {urls.length > 1 ? (
          <View style={[styles.counter, { bottom: insets.bottom + 16 }]} pointerEvents="none">
            <Text style={styles.counterText}>
              {index + 1} / {urls.length}
            </Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.92)' },
  slide: {
    width: SCREEN_W,
    height: SCREEN_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: SCREEN_W, height: SCREEN_H },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(11, 18, 32, 0.55)',
  },
  counterText: { color: colors.white, fontSize: 14, fontWeight: '700' },
});

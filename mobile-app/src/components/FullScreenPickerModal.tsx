import type { ReactNode } from 'react';
import { Modal, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Optional left header slot (e.g. Cancel / Clear). */
  headerLeft?: ReactNode;
  /** Optional right header slot. */
  headerRight?: ReactNode;
  backgroundColor?: string;
};

/**
 * Full-screen slide picker with reliable safe-area padding on iOS/Android.
 * No Done button — dismiss by selecting a row, Android back, or iOS sheet swipe.
 */
export function FullScreenPickerModal({
  visible,
  onClose,
  title,
  children,
  headerLeft,
  headerRight,
  backgroundColor = colors.white,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 0) + 8,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={styles.headerSide}>{headerLeft}</View>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <View style={styles.headerSide}>{headerRight}</View>
        </View>
        <View style={styles.body}>{children}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerSide: {
    width: 72,
    minHeight: 32,
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: { flex: 1 },
});

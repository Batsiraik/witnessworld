import { Image, type ImageContentFit } from 'expo-image';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { getStoredToken, messageAttachmentUrl } from '../api/client';
import { colors } from '../theme/colors';

type Props = {
  attachmentId: number;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  contentFit?: ImageContentFit;
};

/** Inline chat image with Bearer auth (message-attachment.php). */
export function ChatAttachmentImage({
  attachmentId,
  style,
  onPress,
  accessibilityLabel,
  contentFit = 'cover',
}: Props) {
  const [uri, setUri] = useState<string | null>(null);
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getStoredToken();
      if (cancelled || !token) return;
      const h: Record<string, string> = { Accept: 'image/*' };
      h.Authorization = `Bearer ${token}`;
      h['X-Auth-Token'] = token;
      setUri(messageAttachmentUrl(attachmentId));
      setHeaders(h);
    })();
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  if (!uri || !headers) {
    return (
      <View style={[styles.ph, style]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const inner = (
    <Image
      source={{ uri, headers }}
      style={[StyleSheet.absoluteFillObject]}
      contentFit={contentFit}
      cachePolicy="disk"
      transition={120}
      accessibilityLabel={accessibilityLabel}
    />
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={[styles.wrap, style]}
        accessibilityRole="imagebutton"
        accessibilityLabel={accessibilityLabel ?? 'Photo attachment'}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={[styles.wrap, style]}>{inner}</View>;
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: 12, backgroundColor: 'rgba(11,18,32,0.06)' },
  ph: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
    borderRadius: 12,
    backgroundColor: 'rgba(11,18,32,0.06)',
  },
});

import { Image, type ImageProps } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { REMOTE_MEDIA_HEADERS, resolvePublicMediaUrl } from '../utils/mediaUrl';

type Props = Omit<ImageProps, 'source'> & {
  /** Raw URL from API (may be relative or old localhost). */
  url: string | null | undefined;
  style?: StyleProp<ViewStyle>;
};

/**
 * Loads HTTPS (or resolved) media from Witness World with headers/caching.
 * Prefer this over RN Image for all server-hosted avatars and listing images.
 */
export function RemoteImage({ url, style, contentFit = 'cover', ...rest }: Props) {
  const uri = resolvePublicMediaUrl(url);
  if (!uri) {
    return <View style={[styles.fallback, style]} />;
  }
  return (
    <Image
      source={{ uri, headers: REMOTE_MEDIA_HEADERS }}
      style={style}
      contentFit={contentFit}
      cachePolicy="disk"
      transition={120}
      accessibilityIgnoresInvertColors
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: 'transparent' },
});

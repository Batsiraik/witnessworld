import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { RemoteImage } from './RemoteImage';
import { colors } from '../theme/colors';

export type MediaUploadZoneVariant = 'square' | 'wide' | 'hero' | 'compact';

type Props = {
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  imageUrl?: string | null;
  mediaType?: 'image' | 'video';
  /** Primary action line (e.g. "Tap to upload") */
  title: string;
  subtitle?: string;
  variant?: MediaUploadZoneVariant;
  style?: StyleProp<ViewStyle>;
};

const MIN_HEIGHT: Record<MediaUploadZoneVariant, number> = {
  square: 118,
  wide: 128,
  hero: 172,
  compact: 92,
};

/**
 * Obvious upload target: dashed border, cloud/upload icon, clear copy — not a text field.
 */
export function MediaUploadZone({
  onPress,
  loading = false,
  disabled = false,
  imageUrl,
  mediaType = 'image',
  title,
  subtitle,
  variant = 'hero',
  style,
}: Props) {
  const minHeight = MIN_HEIGHT[variant];
  const iconName = mediaType === 'video' ? 'videocam-outline' : 'cloud-upload-outline';
  const compact = variant === 'compact';
  const hasPreview = Boolean(imageUrl) && !loading;
  const iconSize = compact ? 22 : 32;
  const circleSize = compact ? 44 : 56;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.base,
        hasPreview ? styles.baseFilled : styles.baseEmpty,
        { minHeight },
        variant === 'square' && styles.squareCorners,
        compact && styles.compactPadding,
        pressed && !disabled && !loading && styles.pressed,
        (disabled || loading) && styles.muted,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" />
      ) : hasPreview && imageUrl ? (
        <RemoteImage
          url={imageUrl}
          style={styles.preview}
          contentFit="cover"
          accessibilityLabel="Uploaded media preview"
        />
      ) : (
        <View style={[styles.placeholder, compact && styles.placeholderCompact]}>
          <View style={[styles.iconBubble, { width: circleSize, height: circleSize, borderRadius: circleSize / 2 }]}>
            <Ionicons name={iconName} size={iconSize} color={colors.primaryDark} />
          </View>
          <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseEmpty: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(31, 170, 242, 0.5)',
    backgroundColor: 'rgba(31, 170, 242, 0.09)',
  },
  baseFilled: {
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'rgba(11, 18, 32, 0.12)',
    backgroundColor: colors.card,
  },
  squareCorners: { borderRadius: 18 },
  compactPadding: { paddingVertical: 8 },
  pressed: { opacity: 0.9 },
  muted: { opacity: 0.65 },
  preview: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 6,
  },
  placeholderCompact: { paddingVertical: 10, paddingHorizontal: 12, gap: 4 },
  iconBubble: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.28)',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
  },
  titleCompact: { fontSize: 13 },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  subtitleCompact: { fontSize: 11, lineHeight: 15 },
});

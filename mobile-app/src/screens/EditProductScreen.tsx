import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, apiUploadProductMedia } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { MediaUploadZone } from '../components/MediaUploadZone';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'EditProduct'>;

const MAX_PHOTOS = 8;

export function EditProductScreen({ navigation, route }: Props) {
  const { storeId, productId } = route.params;

  const [loading, setLoading] = useState(Boolean(productId));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageUploadPct, setImageUploadPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    try {
      const data = await apiGet(`product-detail.php?id=${productId}`, true);
      const P = data.product as Record<string, unknown> | undefined;
      if (!P) {
        Alert.alert('Not found', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        return;
      }
      setName(String(P.name || ''));
      setDescription(P.description ? String(P.description) : '');
      setSpecifications(P.specifications ? String(P.specifications) : '');
      setPrice(String(P.price_amount || ''));
      setCurrency(String(P.currency || 'USD').toUpperCase());
      const gallery = Array.isArray(P.gallery_urls)
        ? (P.gallery_urls as unknown[]).filter((u): u is string => typeof u === 'string' && u.trim() !== '')
        : [];
      if (gallery.length) {
        setImageUrls(gallery.slice(0, MAX_PHOTOS));
      } else if (P.image_url) {
        setImageUrls([String(P.image_url)]);
      } else {
        setImageUrls([]);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Load failed', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [productId, navigation]);

  useEffect(() => {
    void load();
  }, [load]);

  const pickImages = async () => {
    if (imageUrls.length >= MAX_PHOTOS) {
      Alert.alert('Photo limit', `You can add up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow library access.');
      return;
    }
    setImageBusy(true);
    setImageUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.88,
        allowsMultipleSelection: true,
        selectionLimit: Math.max(1, MAX_PHOTOS - imageUrls.length),
      });
      if (result.canceled || !result.assets?.length) return;
      const next = [...imageUrls];
      for (const a of result.assets) {
        if (next.length >= MAX_PHOTOS) break;
        const mime = a.mimeType ?? 'image/jpeg';
        const { url } = await apiUploadProductMedia(a.uri, mime, storeId, (p) => setImageUploadPct(p));
        if (!next.includes(url)) next.push(url);
      }
      setImageUrls(next);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setImageUploadPct(null);
      setImageBusy(false);
    }
  };

  const removeAt = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const makeCover = (index: number) => {
    setImageUrls((prev) => {
      if (index <= 0 || index >= prev.length) return prev;
      const copy = [...prev];
      const [picked] = copy.splice(index, 1);
      return [picked, ...copy];
    });
  };

  const submit = async () => {
    if (!imageUrls.length) {
      Alert.alert('Photo required', 'Add at least one product photo before saving.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name', 'Enter a product name.');
      return;
    }
    if (!price.trim() || Number.isNaN(Number(price.replace(',', '')))) {
      Alert.alert('Price', 'Enter a valid price.');
      return;
    }
    if (!/^[A-Za-z]{3}$/.test(currency.trim())) {
      Alert.alert('Currency', 'Use a 3-letter code like USD.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        specifications: specifications.trim(),
        price_amount: price.replace(',', ''),
        currency: currency.trim().toUpperCase(),
        image_url: imageUrls[0],
        gallery_urls: imageUrls,
      };
      if (productId) {
        await apiPost('product-update.php', { product_id: productId, ...payload }, true);
      } else {
        await apiPost('product-create.php', { store_id: storeId, ...payload }, true);
      }
      Alert.alert('Saved', 'Your product was saved. It may need admin approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center} edges={['bottom']}>
          <ActivityIndicator size="large" color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Text style={styles.hint}>
              New and edited products are reviewed by an admin before they appear publicly.
            </Text>

            <Text style={styles.label}>Product name *</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Price *</Text>
            <View style={styles.row}>
              <TextInput
                value={price}
                onChangeText={setPrice}
                style={[styles.input, styles.priceInput]}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.textMuted}
              />
              <TextInput
                value={currency}
                onChangeText={(t) => setCurrency(t.toUpperCase().slice(0, 3))}
                style={[styles.input, styles.curInput]}
                placeholder="USD"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                maxLength={3}
              />
            </View>

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multiline]}
              multiline
              placeholder="What buyers should know"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Specifications</Text>
            <TextInput
              value={specifications}
              onChangeText={setSpecifications}
              style={[styles.input, styles.multiline]}
              multiline
              placeholder={'Size, color, materials, SKU, warranty…\nOne line per spec works well.'}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Product photos * ({imageUrls.length}/{MAX_PHOTOS})</Text>
            <Text style={styles.photoHint}>First photo is the cover. Tap a photo to make it cover, or remove extras.</Text>

            {imageUrls.length > 0 ? (
              <View style={styles.gallery}>
                {imageUrls.map((url, index) => (
                  <View key={`${url}-${index}`} style={styles.thumbWrap}>
                    <Pressable onPress={() => makeCover(index)} style={styles.thumbPress}>
                      <RemoteImage url={url} style={styles.thumb} contentFit="cover" />
                      {index === 0 ? (
                        <View style={styles.coverBadge}>
                          <Text style={styles.coverBadgeText}>Cover</Text>
                        </View>
                      ) : null}
                    </Pressable>
                    <Pressable
                      onPress={() => removeAt(index)}
                      style={styles.removeBtn}
                      accessibilityLabel="Remove photo"
                    >
                      <Ionicons name="close" size={14} color={colors.white} />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            {imageUrls.length < MAX_PHOTOS ? (
              <MediaUploadZone
                variant="hero"
                onPress={() => void pickImages()}
                loading={imageBusy}
                disabled={imageBusy}
                imageUrl={null}
                title={imageUrls.length ? 'Add more photos' : 'Tap to upload product photos'}
                subtitle={`Up to ${MAX_PHOTOS} images · JPG, PNG or WebP`}
                mediaType="image"
              />
            ) : null}
            {imageBusy ? (
              <Text style={styles.uploadPct}>
                {imageUploadPct != null ? `Uploading ${imageUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}

            <PrimaryButton
              label={submitting ? 'Saving…' : productId ? 'Save product' : 'Create product'}
              onPress={() => void submit()}
              disabled={submitting}
              loading={submitting}
            />
            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  uploadPct: { marginTop: 8, fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  hint: { fontSize: 13, color: colors.textMuted, marginBottom: 12, lineHeight: 19 },
  photoHint: { fontSize: 12, color: colors.textMuted, marginBottom: 10, lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  row: { flexDirection: 'row', gap: 10 },
  priceInput: { flex: 1 },
  curInput: { width: 88, textAlign: 'center', fontWeight: '800' },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  thumbWrap: { position: 'relative' },
  thumbPress: { borderRadius: 12, overflow: 'hidden' },
  thumb: { width: 88, height: 88, backgroundColor: colors.primarySoft },
  coverBadge: {
    position: 'absolute',
    left: 6,
    top: 6,
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverBadgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

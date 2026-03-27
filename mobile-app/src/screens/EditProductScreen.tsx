import type { NativeStackScreenProps } from '@react-navigation/native-stack';
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
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'EditProduct'>;

export function EditProductScreen({ navigation, route }: Props) {
  const { storeId, productId } = route.params;

  const [loading, setLoading] = useState(Boolean(productId));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [specifications, setSpecifications] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
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
      setImageUrl(P.image_url ? String(P.image_url) : null);
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

  const pickImage = async () => {
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
      });
      if (result.canceled || !result.assets[0]) return;
      const a = result.assets[0];
      const mime = a.mimeType ?? 'image/jpeg';
      const { url } = await apiUploadProductMedia(a.uri, mime, storeId, (p) => setImageUploadPct(p));
      setImageUrl(url);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setImageUploadPct(null);
      setImageBusy(false);
    }
  };

  const submit = async () => {
    if (!imageUrl?.trim()) {
      Alert.alert('Photo required', 'Add a product photo before saving.');
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
      if (productId) {
        await apiPost(
          'product-update.php',
          {
            product_id: productId,
            name: name.trim(),
            description: description.trim(),
            specifications: specifications.trim(),
            price_amount: price.replace(',', ''),
            currency: currency.trim().toUpperCase(),
            image_url: imageUrl ?? '',
          },
          true
        );
      } else {
        await apiPost(
          'product-create.php',
          {
            store_id: storeId,
            name: name.trim(),
            description: description.trim(),
            specifications: specifications.trim(),
            price_amount: price.replace(',', ''),
            currency: currency.trim().toUpperCase(),
            image_url: imageUrl ?? '',
          },
          true
        );
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

            <Text style={styles.label}>Product photo *</Text>
            <MediaUploadZone
              variant="hero"
              onPress={() => void pickImage()}
              loading={imageBusy}
              disabled={imageBusy}
              imageUrl={imageUrl}
              title={imageUrl ? 'Replace product photo' : 'Tap to upload product photo'}
              subtitle="Required — clear, well-lit image sells better"
              mediaType="image"
            />
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
});

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiPost, apiUploadStoreMedia } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { MediaUploadZone } from '../components/MediaUploadZone';
import type { OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<OfficeStackParamList, 'EditStore'>;

type LocCountry = { code: string; name: string };
type LocState = { code: string; name: string };

const DELIVERY = [
  { value: 'digital_only', label: 'Digital only', sub: 'No shipping — files, licenses, downloads' },
  { value: 'usa_only', label: 'USA only', sub: 'Ship within the United States' },
  { value: 'worldwide', label: 'Worldwide', sub: 'International shipping' },
  { value: 'local_pickup', label: 'Local pickup', sub: 'Buyers collect in person' },
  { value: 'custom', label: 'Custom / other', sub: 'Describe below' },
] as const;

export function EditStoreScreen({ navigation, route }: Props) {
  const storeId = route.params.storeId;

  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');

  const [name, setName] = useState('');
  const [sellsSummary, setSellsSummary] = useState('');
  const [description, setDescription] = useState('');
  const [deliveryType, setDeliveryType] = useState<string>('worldwide');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [bannerBusy, setBannerBusy] = useState(false);
  const [storeUploadPct, setStoreUploadPct] = useState<number | null>(null);

  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);
  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [storeStatus, setStoreStatus] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const loc = await apiGet('locations.php', false);
        const cs = loc.countries;
        const ss = loc.us_states;
        const ucc = typeof loc.us_country_code === 'string' ? loc.us_country_code : 'US';
        if (!cancelled && Array.isArray(cs)) {
          setCountries(
            cs.filter((c): c is LocCountry => {
              return c != null && typeof c === 'object' && typeof c.code === 'string' && typeof c.name === 'string';
            })
          );
        }
        if (!cancelled && Array.isArray(ss)) {
          setUsStates(
            ss.filter((s): s is LocState => {
              return s != null && typeof s === 'object' && typeof s.code === 'string' && typeof s.name === 'string';
            })
          );
        }
        if (!cancelled) setUsCountryCode(ucc);

        const data = await apiGet(`store-detail.php?id=${storeId}`, true);
        if (cancelled) return;
        const S = data.store as Record<string, unknown> | undefined;
        if (!S) {
          Alert.alert('Not found', 'Could not load this store.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        setStoreStatus(String(S.moderation_status || ''));
        setName(String(S.name || ''));
        setSellsSummary(String(S.sells_summary || ''));
        setDescription(String(S.description || ''));
        setDeliveryType(String(S.delivery_type || 'worldwide'));
        setDeliveryNotes(S.delivery_notes ? String(S.delivery_notes) : '');
        setLogoUrl(S.logo_url ? String(S.logo_url) : null);
        setBannerUrl(S.banner_url ? String(S.banner_url) : null);

        const cc = String(S.location_country_code || '').toUpperCase();
        const statesList = Array.isArray(ss)
          ? ss.filter((s): s is LocState => {
              return s != null && typeof s === 'object' && typeof s.code === 'string' && typeof s.name === 'string';
            })
          : [];
        const countriesList = Array.isArray(cs)
          ? cs.filter((c): c is LocCountry => {
              return c != null && typeof c === 'object' && typeof c.code === 'string' && typeof c.name === 'string';
            })
          : [];
        const cObj = countriesList.find((c) => c.code === cc) ?? null;
        setCountry(cObj);
        const stateName = S.location_us_state ? String(S.location_us_state) : '';
        if (stateName && statesList.length) {
          const stObj = statesList.find((s) => s.name === stateName) ?? null;
          setUsState(stObj);
        } else {
          setUsState(null);
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Could not load', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storeId, navigation]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q));
  }, [countries, countryQuery]);

  const filteredStates = useMemo(() => {
    const q = stateQuery.trim().toLowerCase();
    if (!q) return usStates;
    return usStates.filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
  }, [usStates, stateQuery]);

  const deliveryLabel = useMemo(() => {
    const d = DELIVERY.find((x) => x.value === deliveryType);
    return d ? d.label : deliveryType;
  }, [deliveryType]);

  const pickUpload = async (kind: 'logo' | 'banner') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow photo library access to upload.');
      return;
    }
    if (kind === 'logo') setLogoBusy(true);
    else setBannerBusy(true);
    setStoreUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: kind === 'logo' && Platform.OS === 'ios',
        aspect: kind === 'logo' && Platform.OS === 'ios' ? [1, 1] : undefined,
        quality: 0.88,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      const { url } = await apiUploadStoreMedia(asset.uri, mime, kind, (p) => setStoreUploadPct(p));
      if (kind === 'logo') setLogoUrl(url);
      else setBannerUrl(url);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setStoreUploadPct(null);
      if (kind === 'logo') setLogoBusy(false);
      else setBannerBusy(false);
    }
  };

  const submit = async () => {
    if (storeStatus === 'suspended') {
      Alert.alert('Suspended', 'This store is suspended. Contact support.');
      return;
    }
    if (!country) {
      Alert.alert('Location', 'Select a country.');
      return;
    }
    if (country.code === usCountryCode && !usState) {
      Alert.alert('Location', 'Select a U.S. state.');
      return;
    }
    if (!name.trim() || !sellsSummary.trim() || !description.trim() || !logoUrl) {
      Alert.alert('Form', 'Fill required fields including logo.');
      return;
    }
    if (deliveryType === 'custom' && deliveryNotes.trim().length < 3) {
      Alert.alert('Delivery', 'Add delivery details for custom.');
      return;
    }

    const body: Record<string, unknown> = {
      store_id: storeId,
      name: name.trim(),
      sells_summary: sellsSummary.trim(),
      description: description.trim(),
      logo_url: logoUrl,
      banner_url: bannerUrl ?? '',
      location_country_code: country.code,
      delivery_type: deliveryType,
      delivery_notes: deliveryNotes.trim(),
    };
    if (country.code === usCountryCode && usState) {
      body.location_us_state_code = usState.code;
    }

    setSubmitting(true);
    try {
      const res = await apiPost('store-update.php', body, true);
      const msg = typeof res.message === 'string' ? res.message : 'Saved.';
      Alert.alert('Saved', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
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
            {storeStatus === 'approved' ? (
              <Text style={styles.warn}>
                Editing an approved store sends it back to admin for review before shoppers see updates.
              </Text>
            ) : null}

            <Text style={styles.label}>Store name *</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>What you sell *</Text>
            <TextInput
              value={sellsSummary}
              onChangeText={setSellsSummary}
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>About your store *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multiline]}
              multiline
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Store logo *</Text>
            <MediaUploadZone
              variant="square"
              onPress={() => void pickUpload('logo')}
              loading={logoBusy}
              disabled={logoBusy}
              imageUrl={logoUrl}
              title={logoUrl ? 'Replace store logo' : 'Tap to upload logo'}
              subtitle="Required · JPG or PNG — square works best"
              mediaType="image"
            />

            <Text style={styles.label}>Banner (optional)</Text>
            <MediaUploadZone
              variant="wide"
              onPress={() => void pickUpload('banner')}
              loading={bannerBusy}
              disabled={bannerBusy}
              imageUrl={bannerUrl}
              title={bannerUrl ? 'Replace banner image' : 'Tap to upload banner'}
              subtitle="Wide image for your storefront header"
              mediaType="image"
            />
            {logoBusy || bannerBusy ? (
              <Text style={styles.uploadPct}>
                {storeUploadPct != null ? `Uploading ${storeUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}

            <Text style={styles.label}>Country *</Text>
            <Pressable onPress={() => setCountryModal(true)} style={styles.selectRow}>
              <Text style={country ? styles.selectVal : styles.selectPh}>
                {country ? `${country.name}` : 'Select'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>
            {country?.code === usCountryCode ? (
              <Pressable onPress={() => setStateModal(true)} style={styles.selectRow}>
                <Text style={usState ? styles.selectVal : styles.selectPh}>
                  {usState ? usState.name : 'U.S. state'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}

            <Text style={styles.label}>Delivery *</Text>
            <Pressable onPress={() => setDeliveryModal(true)} style={styles.selectRow}>
              <Text style={styles.selectVal}>{deliveryLabel}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>
            {(deliveryType === 'custom' || deliveryNotes.trim() !== '') && (
              <>
                <Text style={styles.label}>{deliveryType === 'custom' ? 'Details *' : 'Notes'}</Text>
                <TextInput
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                  style={[styles.input, styles.multiline]}
                  multiline
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            <PrimaryButton
              label={submitting ? 'Saving…' : 'Save changes'}
              onPress={() => void submit()}
              disabled={submitting}
              loading={submitting}
            />
            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        <Modal visible={countryModal} animationType="slide" onRequestClose={() => setCountryModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setCountryModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Country</Text>
              <View style={{ width: 48 }} />
            </View>
            <TextInput
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search"
              style={styles.search}
              placeholderTextColor={colors.textMuted}
            />
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCountry(item);
                    setUsState(null);
                    setCountryModal(false);
                    setCountryQuery('');
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={stateModal} animationType="slide" onRequestClose={() => setStateModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setStateModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>State</Text>
              <View style={{ width: 48 }} />
            </View>
            <TextInput
              value={stateQuery}
              onChangeText={setStateQuery}
              placeholder="Search"
              style={styles.search}
              placeholderTextColor={colors.textMuted}
            />
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setUsState(item);
                    setStateModal(false);
                    setStateQuery('');
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.name}</Text>
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>

        <Modal visible={deliveryModal} animationType="slide" onRequestClose={() => setDeliveryModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setDeliveryModal(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Delivery</Text>
              <View style={{ width: 48 }} />
            </View>
            <FlatList
              data={[...DELIVERY]}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setDeliveryType(item.value);
                    setDeliveryModal(false);
                  }}
                  style={styles.modalRow}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalRowText}>{item.label}</Text>
                    <Text style={styles.modalSub}>{item.sub}</Text>
                  </View>
                  {dropdownCheck(deliveryType, item.value)}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

function dropdownCheck(current: string, value: string) {
  return current === value ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  warn: {
    fontSize: 13,
    lineHeight: 19,
    color: '#92400e',
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: 14 },
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
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  uploadPct: { marginTop: 8, fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
    gap: 8,
  },
  selectVal: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 16, color: colors.textMuted },
  modalSafe: { flex: 1, backgroundColor: colors.white },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modalClose: { fontSize: 16, fontWeight: '700', color: colors.primary },
  search: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  modalRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalRowText: { fontSize: 16, fontWeight: '600', color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});

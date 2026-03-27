import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { RemoteImage } from '../components/RemoteImage';
import { PrimaryButton } from '../components/PrimaryButton';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<HomeStackParamList, 'CreateStore'>;

type LocCountry = { code: string; name: string };
type LocState = { code: string; name: string };

const DELIVERY = [
  { value: 'digital_only', label: 'Digital only', sub: 'No shipping — files, licenses, downloads' },
  { value: 'usa_only', label: 'USA only', sub: 'Ship within the United States' },
  { value: 'worldwide', label: 'Worldwide', sub: 'International shipping' },
  { value: 'local_pickup', label: 'Local pickup', sub: 'Buyers collect in person' },
  { value: 'custom', label: 'Custom / other', sub: 'Describe below' },
] as const;

export function CreateStoreScreen({ navigation, route }: Props) {
  const { user, refreshProfile } = useDashboardContext();
  const seed = typeof route.params?.seed === 'number' ? route.params.seed : 0;

  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');
  const [locLoading, setLocLoading] = useState(true);

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

  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (!hasAvatar) {
      Alert.alert(
        'Profile photo required',
        'Upload a profile picture in Profile & settings before opening a store.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [hasAvatar, navigation]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      try {
        const data = await apiGet('locations.php', false);
        const cs = data.countries;
        const ss = data.us_states;
        const ucc = typeof data.us_country_code === 'string' ? data.us_country_code : 'US';
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
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Could not load locations', e instanceof Error ? e.message : 'Try again later.');
        }
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!seed) return;
    setName('');
    setSellsSummary('');
    setDescription('');
    setDeliveryType('worldwide');
    setDeliveryNotes('');
    setLogoUrl(null);
    setBannerUrl(null);
    setCountry(null);
    setUsState(null);
  }, [seed]);

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
    if (!hasAvatar) {
      Alert.alert('Profile photo required', 'Add a profile picture first.');
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
    if (!name.trim()) {
      Alert.alert('Store name', 'Enter your store name.');
      return;
    }
    if (!sellsSummary.trim()) {
      Alert.alert('What you sell', 'Add a short line about what you sell.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description', 'Tell shoppers about your store.');
      return;
    }
    if (!logoUrl) {
      Alert.alert('Logo', 'Upload a store logo.');
      return;
    }
    if (deliveryType === 'custom' && deliveryNotes.trim().length < 3) {
      Alert.alert('Delivery', 'Describe your shipping or delivery rules (at least 3 characters).');
      return;
    }

    const body: Record<string, unknown> = {
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
      const res = await apiPost('store-create.php', body, true);
      const msg = typeof res.message === 'string' ? res.message : 'Store submitted for review.';
      Alert.alert('Submitted', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Could not create store', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (locLoading) {
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
            <Text style={styles.lead}>
              Your storefront is reviewed before it goes live.{' '}
              <Text style={styles.leadEm}>You cannot add products until an admin approves your store.</Text> After
              approval, use My office → Manage store to list items. Product changes also go through review.
            </Text>

            <Text style={styles.label}>Store name *</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Cedar Wood Crafts"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>What you sell (short line) *</Text>
            <TextInput
              value={sellsSummary}
              onChangeText={setSellsSummary}
              placeholder="e.g. Handmade cutting boards & kitchenware"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>About your store *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Story, policies, what makes your shop special…"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.multiline]}
              multiline
            />

            <Text style={styles.label}>Store logo *</Text>
            <Pressable
              onPress={() => void pickUpload('logo')}
              style={({ pressed }) => [styles.mediaBtn, pressed && styles.pressed]}
            >
              {logoBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : logoUrl ? (
                <RemoteImage url={logoUrl} style={styles.logoPrev} contentFit="cover" />
              ) : (
                <Text style={styles.mediaBtnText}>Tap to upload logo</Text>
              )}
            </Pressable>

            <Text style={styles.label}>Banner (optional)</Text>
            <Pressable
              onPress={() => void pickUpload('banner')}
              style={({ pressed }) => [styles.mediaBtn, styles.bannerBtn, pressed && styles.pressed]}
            >
              {bannerBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : bannerUrl ? (
                <RemoteImage url={bannerUrl} style={styles.bannerPrev} contentFit="cover" />
              ) : (
                <Text style={styles.mediaBtnText}>Wide image for your storefront header</Text>
              )}
            </Pressable>
            {logoBusy || bannerBusy ? (
              <Text style={styles.uploadPct}>
                {storeUploadPct != null ? `Uploading ${storeUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}

            <Text style={styles.label}>Store location *</Text>
            <Pressable onPress={() => setCountryModal(true)} style={styles.selectRow}>
              <Text style={country ? styles.selectVal : styles.selectPh}>
                {country ? `${country.name} (${country.code})` : 'Select country'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>
            {country?.code === usCountryCode ? (
              <Pressable onPress={() => setStateModal(true)} style={styles.selectRow}>
                <Text style={usState ? styles.selectVal : styles.selectPh}>
                  {usState ? usState.name : 'Select U.S. state'}
                </Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}

            <Text style={styles.label}>Where do you deliver? *</Text>
            <Pressable onPress={() => setDeliveryModal(true)} style={styles.selectRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectVal}>{deliveryLabel}</Text>
                {deliveryType === 'custom' ? (
                  <Text style={styles.hint}>You must add details below.</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>
            {(deliveryType === 'custom' || deliveryNotes.trim() !== '') && (
              <>
                <Text style={styles.label}>
                  {deliveryType === 'custom' ? 'Describe delivery *' : 'Extra delivery notes (optional)'}
                </Text>
                <TextInput
                  value={deliveryNotes}
                  onChangeText={setDeliveryNotes}
                  placeholder={
                    deliveryType === 'custom'
                      ? 'e.g. EU only, UK and Ireland, no PO boxes…'
                      : 'Optional clarification for buyers'
                  }
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.multiline]}
                  multiline
                />
              </>
            )}

            <PrimaryButton
              label={submitting ? 'Submitting…' : 'Submit store for review'}
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
                  <Text style={styles.modalRowMeta}>{item.code}</Text>
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
                  {deliveryType === item.value ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                </Pressable>
              )}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 32 },
  lead: { fontSize: 14, lineHeight: 21, color: colors.textMuted, marginBottom: 16 },
  leadEm: { color: colors.text, fontWeight: '800' },
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
  multiline: { minHeight: 120, textAlignVertical: 'top' },
  mediaBtn: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bannerBtn: { minHeight: 140 },
  mediaBtnText: { color: colors.textMuted, fontWeight: '600', padding: 16, textAlign: 'center' },
  logoPrev: { width: 120, height: 120, borderRadius: 16 },
  bannerPrev: { width: '100%', height: 140 },
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
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  uploadPct: { marginTop: 8, fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  pressed: { opacity: 0.92 },
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
  modalRowMeta: { fontSize: 13, color: colors.textMuted },
  modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
});

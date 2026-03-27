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
import { apiGet, apiPost, apiUploadDirectoryLogo } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList, OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'CreateDirectoryEntry'>
  | NativeStackScreenProps<OfficeStackParamList, 'EditDirectoryEntry'>;

type LocCountry = { code: string; name: string };
type LocState = { code: string; name: string };
type Cat = { slug: string; label: string };

function entryIdFromRoute(route: Props['route']): number | undefined {
  if ('entryId' in route.params && typeof route.params.entryId === 'number') {
    return route.params.entryId;
  }
  return undefined;
}

function seedFromRoute(route: Props['route']): number {
  if ('seed' in route.params && typeof route.params.seed === 'number') {
    return route.params.seed;
  }
  return 0;
}

export function CreateDirectoryEntryScreen({ navigation, route }: Props) {
  const editId = entryIdFromRoute(route);
  const seed = seedFromRoute(route);
  const { user, refreshProfile } = useDashboardContext();

  const [categories, setCategories] = useState<Cat[]>([]);
  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');
  const [locLoading, setLocLoading] = useState(true);
  const [editLoading, setEditLoading] = useState(Boolean(editId));

  const [businessName, setBusinessName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [mapUrl, setMapUrl] = useState('');
  const [hoursText, setHoursText] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoUploadPct, setLogoUploadPct] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
    }, [refreshProfile])
  );

  useEffect(() => {
    if (editId) return;
    if (!hasAvatar) {
      Alert.alert(
        'Profile photo required',
        'Add a profile photo in Profile & settings first.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [hasAvatar, navigation, editId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLocLoading(true);
      try {
        const [loc, cats] = await Promise.all([apiGet('locations.php', false), apiGet('directory-categories.php', false)]);
        if (cancelled) return;
        const cs = loc.countries;
        const ss = loc.us_states;
        const ucc = typeof loc.us_country_code === 'string' ? loc.us_country_code : 'US';
        if (Array.isArray(cs)) {
          setCountries(
            cs.filter((c): c is LocCountry => {
              return c != null && typeof c === 'object' && typeof c.code === 'string' && typeof c.name === 'string';
            })
          );
        }
        if (Array.isArray(ss)) {
          setUsStates(
            ss.filter((s): s is LocState => {
              return s != null && typeof s === 'object' && typeof s.code === 'string' && typeof s.name === 'string';
            })
          );
        }
        setUsCountryCode(ucc);
        const raw = cats.categories;
        if (Array.isArray(raw)) {
          setCategories(
            raw.filter((x): x is Cat => {
              return x != null && typeof x === 'object' && typeof x.slug === 'string' && typeof x.label === 'string';
            })
          );
        }
      } catch {
        if (!cancelled) Alert.alert('Error', 'Could not load form data.');
      } finally {
        if (!cancelled) setLocLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!seed || editId) return;
    setBusinessName('');
    setTagline('');
    setDescription('');
    setCategorySlug(null);
    setCountry(null);
    setUsState(null);
    setAddressLine('');
    setCity('');
    setPostalCode('');
    setPhone('');
    setEmail('');
    setWebsite('');
    setMapUrl('');
    setHoursText('');
    setLogoUrl(null);
  }, [seed, editId]);

  useEffect(() => {
    if (!editId || countries.length === 0) return;
    let cancelled = false;
    setEditLoading(true);
    (async () => {
      try {
        const data = await apiGet(`directory-entry-detail.php?id=${editId}`, true);
        if (cancelled) return;
        const E = data.entry as Record<string, unknown> | undefined;
        if (!E) {
          Alert.alert('Not found', '', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          return;
        }
        setBusinessName(String(E.business_name || ''));
        setTagline(E.tagline ? String(E.tagline) : '');
        setDescription(E.description ? String(E.description) : '');
        setCategorySlug(String(E.category || '') || null);
        setAddressLine(E.address_line ? String(E.address_line) : '');
        setCity(String(E.city || ''));
        setPostalCode(E.postal_code ? String(E.postal_code) : '');
        setPhone(String(E.phone || ''));
        setEmail(String(E.email || ''));
        setWebsite(E.website ? String(E.website) : '');
        setMapUrl(E.map_url ? String(E.map_url) : '');
        setHoursText(E.hours_text ? String(E.hours_text) : '');
        setLogoUrl(E.logo_url ? String(E.logo_url) : null);

        const cc = String(E.location_country_code || '').toUpperCase();
        const cObj = countries.find((c) => c.code === cc) ?? null;
        setCountry(cObj);
        const stateName = E.location_us_state ? String(E.location_us_state) : '';
        if (stateName && usStates.length) {
          const stObj = usStates.find((s) => s.name === stateName) ?? null;
          setUsState(stObj);
        } else {
          setUsState(null);
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Load failed', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editId, countries, usStates, navigation]);

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

  const catLabel = categorySlug ? categories.find((c) => c.slug === categorySlug)?.label ?? 'Category' : 'Select category';

  const pickLogo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Allow library access.');
      return;
    }
    setLogoBusy(true);
    setLogoUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS === 'ios',
        aspect: Platform.OS === 'ios' ? [1, 1] : undefined,
        quality: 0.88,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const a = result.assets[0];
      const { url } = await apiUploadDirectoryLogo(a.uri, a.mimeType ?? 'image/jpeg', (p) =>
        setLogoUploadPct(p)
      );
      setLogoUrl(url);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setLogoUploadPct(null);
      setLogoBusy(false);
    }
  };

  const submit = async () => {
    if (!editId && !hasAvatar) {
      Alert.alert('Profile', 'Add a profile photo first.');
      return;
    }
    if (!categorySlug) {
      Alert.alert('Category', 'Select a category.');
      return;
    }
    if (!country) {
      Alert.alert('Location', 'Select a country.');
      return;
    }
    if (country.code === usCountryCode && !usState) {
      Alert.alert('Location', 'Select a U.S. state for this listing.');
      return;
    }
    if (!businessName.trim() || !city.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('Form', 'Business name, city, phone, and email are required.');
      return;
    }

    const body: Record<string, unknown> = {
      business_name: businessName.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      category: categorySlug,
      location_country_code: country.code,
      address_line: addressLine.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      phone: phone.trim(),
      email: email.trim(),
      website: website.trim(),
      map_url: mapUrl.trim(),
      hours_text: hoursText.trim(),
      logo_url: logoUrl ?? '',
    };
    if (country.code === usCountryCode && usState) {
      body.location_us_state_code = usState.code;
    }

    setSubmitting(true);
    try {
      if (editId) {
        body.entry_id = editId;
        await apiPost('directory-entry-update.php', body, true);
        Alert.alert('Saved', 'Your listing was updated. It may need admin review again.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await apiPost('directory-entry-create.php', body, true);
        Alert.alert('Submitted', 'Your business was sent for review.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (locLoading || editLoading) {
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
              Phone, email, website, and map link are public so customers can reach you. Listings are reviewed before
              they appear in the directory. You can add several businesses per account.
            </Text>

            <Text style={styles.label}>Business name *</Text>
            <TextInput value={businessName} onChangeText={setBusinessName} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Tagline</Text>
            <TextInput value={tagline} onChangeText={setTagline} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Category *</Text>
            <Pressable onPress={() => setCatModal(true)} style={styles.selectRow}>
              <Text style={categorySlug ? styles.selectVal : styles.selectPh}>{catLabel}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              style={[styles.input, styles.multiline]}
              multiline
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Logo (optional)</Text>
            <Pressable onPress={() => void pickLogo()} style={styles.logoBtn}>
              {logoBusy ? (
                <ActivityIndicator color={colors.primary} />
              ) : logoUrl ? (
                <RemoteImage url={logoUrl} style={styles.logoPrev} contentFit="cover" />
              ) : (
                <Text style={styles.logoBtnText}>Tap to upload</Text>
              )}
            </Pressable>
            {logoBusy ? (
              <Text style={styles.uploadPct}>
                {logoUploadPct != null ? `Uploading ${logoUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}

            <Text style={styles.label}>Country *</Text>
            <Pressable onPress={() => setCountryModal(true)} style={styles.selectRow}>
              <Text style={country ? styles.selectVal : styles.selectPh}>{country ? country.name : 'Select'}</Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>
            {country?.code === usCountryCode ? (
              <Pressable onPress={() => setStateModal(true)} style={styles.selectRow}>
                <Text style={usState ? styles.selectVal : styles.selectPh}>{usState ? usState.name : 'U.S. state *'}</Text>
                <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
              </Pressable>
            ) : null}

            <Text style={styles.label}>Street address</Text>
            <TextInput value={addressLine} onChangeText={setAddressLine} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>City *</Text>
            <TextInput value={city} onChangeText={setCity} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Postal / ZIP code</Text>
            <TextInput value={postalCode} onChangeText={setPostalCode} style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Public phone *</Text>
            <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Public email *</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>Website (https://…)</Text>
            <TextInput value={website} onChangeText={setWebsite} autoCapitalize="none" style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Map link (Google Maps, etc.)</Text>
            <TextInput value={mapUrl} onChangeText={setMapUrl} autoCapitalize="none" style={styles.input} placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Hours</Text>
            <TextInput
              value={hoursText}
              onChangeText={setHoursText}
              style={[styles.input, styles.multiline]}
              multiline
              placeholder="e.g. Mon–Fri 9–5"
              placeholderTextColor={colors.textMuted}
            />

            <PrimaryButton
              label={submitting ? 'Saving…' : editId ? 'Save changes' : 'Submit for review'}
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
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Country</Text>
              <View style={{ width: 48 }} />
            </View>
            <TextInput
              value={countryQuery}
              onChangeText={setCountryQuery}
              placeholder="Search"
              style={styles.modalSearch}
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
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>State</Text>
              <View style={{ width: 48 }} />
            </View>
            <TextInput
              value={stateQuery}
              onChangeText={setStateQuery}
              placeholder="Search"
              style={styles.modalSearch}
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

        <Modal visible={catModal} animationType="slide" onRequestClose={() => setCatModal(false)}>
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setCatModal(false)}>
                <Text style={styles.modalDone}>Done</Text>
              </Pressable>
              <Text style={styles.modalTitle}>Category</Text>
              <View style={{ width: 48 }} />
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item.slug}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setCategorySlug(item.slug);
                    setCatModal(false);
                  }}
                  style={styles.modalRow}
                >
                  <Text style={styles.modalRowText}>{item.label}</Text>
                  {categorySlug === item.slug ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
  lead: { fontSize: 13, lineHeight: 20, color: colors.textMuted, marginBottom: 12 },
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
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: colors.card,
  },
  selectVal: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  selectPh: { flex: 1, fontSize: 16, color: colors.textMuted },
  uploadPct: { marginTop: 8, fontSize: 14, fontWeight: '800', color: colors.primaryDark },
  logoBtn: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBtnText: { color: colors.textMuted, fontWeight: '600' },
  logoPrev: { width: 100, height: 100, borderRadius: 16 },
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
  modalDone: { fontSize: 16, fontWeight: '700', color: colors.primary },
  modalSearch: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  modalRowText: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
});

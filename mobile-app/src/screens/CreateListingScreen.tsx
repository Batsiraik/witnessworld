import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
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
import { apiGet, apiPost, apiUploadListingMedia } from '../api/client';
import { GradientBackground } from '../components/GradientBackground';
import { MediaUploadZone } from '../components/MediaUploadZone';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList, OfficeStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'CreateListing'>
  | NativeStackScreenProps<OfficeStackParamList, 'EditListing'>;

function listingEditId(
  p: HomeStackParamList['CreateListing'] | OfficeStackParamList['EditListing'] | undefined
): number | undefined {
  if (!p || typeof p !== 'object') {
    return undefined;
  }
  return 'listingId' in p && typeof p.listingId === 'number' ? p.listingId : undefined;
}

function listingSeed(p: HomeStackParamList['CreateListing'] | OfficeStackParamList['EditListing'] | undefined): number {
  if (!p || typeof p !== 'object') {
    return 0;
  }
  return 'seed' in p && typeof p.seed === 'number' ? p.seed : 0;
}

type LocCountry = { code: string; name: string };
type LocState = { code: string; name: string };

export function CreateListingScreen({ navigation, route }: Props) {
  const { user, refreshProfile } = useDashboardContext();
  const params = route.params ?? {};
  const editId = listingEditId(route.params);
  const seed = listingSeed(route.params);
  const ltRoute =
    'listingType' in params && (params.listingType === 'service' || params.listingType === 'classified')
      ? params.listingType
      : 'classified';
  const [listingType, setListingType] = useState<'classified' | 'service'>(ltRoute);
  const [editLoading, setEditLoading] = useState(() => Boolean(editId));

  useLayoutEffect(() => {
    if (editId) {
      navigation.setOptions({ title: 'Edit listing' });
    } else {
      navigation.setOptions({
        title: listingType === 'service' ? 'New service listing' : 'New classified ad',
      });
    }
  }, [navigation, editId, listingType]);

  const [countries, setCountries] = useState<LocCountry[]>([]);
  const [usStates, setUsStates] = useState<LocState[]>([]);
  const [usCountryCode, setUsCountryCode] = useState('US');
  const [locLoading, setLocLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [softSkillsText, setSoftSkillsText] = useState('');

  const [mainUrl, setMainUrl] = useState<string | null>(null);
  const [mainBusy, setMainBusy] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>([]);
  const [portfolioBusy, setPortfolioBusy] = useState(false);
  const [mediaUploadPct, setMediaUploadPct] = useState<number | null>(null);

  const [country, setCountry] = useState<LocCountry | null>(null);
  const [usState, setUsState] = useState<LocState | null>(null);
  const [countryModal, setCountryModal] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [stateQuery, setStateQuery] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const hasAvatar = Boolean(user?.avatar_url && String(user.avatar_url).trim() !== '');

  const formCopy = useMemo(() => {
    const svc = listingType === 'service';
    if (editId) {
      return {
        kindLabel: svc ? 'Service listing' : 'Classified ad',
        kindService: svc,
        hint: 'Saving changes requeues your listing for review if it was already approved or rejected. Removed listings cannot be edited.',
        titleLabel: svc ? 'Headline *' : 'Ad title *',
        titlePh: svc
          ? 'e.g. Logo & brand kit for startups — packages from $299'
          : 'e.g. Solid wood desk — $120 OBO · downtown pickup',
        descLabel: svc ? 'What you deliver *' : 'Ad details *',
        descPh: svc
          ? 'Your process, what’s included, typical timing, tools you use, and how someone should get started…'
          : 'What you’re selling or offering, condition, price or “make an offer,” pickup/delivery, and how to reach you…',
        mainMicro: svc
          ? 'A professional photo of you or your best work stands out.'
          : 'Show the product, the space, or yourself—clear photos get more replies.',
        videoMicro: svc ? 'Optional intro video helps clients choose you with confidence.' : 'Quick walk-around or demo clips work well for items or gigs.',
        portfolioLabel: svc ? 'Portfolio / samples (optional)' : 'More photos (optional)',
        portfolioMicro: svc ? 'Screenshots, before/after, or case-study images.' : 'Extra angles, detail shots, or proof of condition.',
        skillsLabel: svc ? 'Skills & tools (optional)' : 'Tags (optional)',
        skillsPh: svc ? 'e.g. React Native, SEO, Bookkeeping, Spanish' : 'e.g. Cash only, Evenings, Licensed, Local pickup',
        skillsMicro: svc ? 'Short tags help the right clients discover you.' : 'Help people skim your ad at a glance.',
      };
    }
    return {
      kindLabel: svc ? 'Service listing' : 'Classified ad',
      kindService: svc,
      hint: svc
        ? 'You’re posting as a provider people can hire. Say what you do, how you work, and what clients can expect. Everything is reviewed before it goes public.'
        : 'You’re posting a classified-style ad—what you’re selling, a one-time offer, or what you’re looking for in the community. Everything is reviewed before it goes public.',
      titleLabel: svc ? 'Headline *' : 'Ad title *',
      titlePh: svc
        ? 'e.g. Mobile notary · evenings & weekends — same-day appointments'
        : 'e.g. Couch + loveseat · must go by Friday · $400',
      descLabel: svc ? 'What you deliver *' : 'Ad details *',
      descPh: svc
        ? 'Experience, packages or pricing style, service area, how to book you, and anything clients should know up front…'
        : 'Describe the item or offer, condition, your asking price or “best offer,” location, and the best way to contact you…',
      mainMicro: svc
        ? 'Use a strong image of your work or a friendly headshot—clients hire people they trust.'
        : 'Your main photo is the hook—make it obvious what the ad is about.',
      videoMicro: svc ? 'Short clips work great for coaches, makers, and anyone who sells a personal service.' : 'Optional video helps for vehicles, rentals, or quick “see it in action” demos.',
      portfolioLabel: svc ? 'Portfolio / past work (optional)' : 'Extra photos (optional)',
      portfolioMicro: svc ? 'Up to 12 images. Show variety and real results.' : 'Up to 12 images. More proof = fewer back-and-forth messages.',
      skillsLabel: svc ? 'Skills & strengths (optional)' : 'Tags (optional)',
      skillsPh: svc ? 'e.g. PAT testing, UX writing, Event photography' : 'e.g. Negotiable, Delivery extra, Trade considered',
      skillsMicro: svc ? 'Comma-separated. These read like skill tags on your listing.' : 'Comma-separated. Useful filters for buyers skimming many ads.',
    };
  }, [listingType, editId]);

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
        'Upload a profile picture in Profile & settings before posting a listing.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [hasAvatar, navigation, editId]);

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
              return (
                c != null &&
                typeof c === 'object' &&
                typeof (c as LocCountry).code === 'string' &&
                typeof (c as LocCountry).name === 'string'
              );
            })
          );
        }
        if (!cancelled && Array.isArray(ss)) {
          setUsStates(
            ss.filter((s): s is LocState => {
              return (
                s != null &&
                typeof s === 'object' &&
                typeof (s as LocState).code === 'string' &&
                typeof (s as LocState).name === 'string'
              );
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
    if (editId) return;
    if (!seed) return;
    setTitle('');
    setDescription('');
    setSoftSkillsText('');
    setMainUrl(null);
    setVideoUrl(null);
    setPortfolioUrls([]);
    setCountry(null);
    setUsState(null);
    setListingType(ltRoute);
  }, [editId, seed, ltRoute]);

  useEffect(() => {
    if (!editId || countries.length === 0) return;
    let cancelled = false;
    setEditLoading(true);
    (async () => {
      try {
        const data = await apiGet(`listing-detail.php?id=${editId}`, true);
        if (cancelled) return;
        const L = data.listing as Record<string, unknown> | undefined;
        if (!L) {
          Alert.alert('Not found', 'This listing could not be loaded.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
          return;
        }
        const lt = String(L.listing_type || 'classified');
        setListingType(lt === 'service' ? 'service' : 'classified');
        setTitle(String(L.title || ''));
        setDescription(String(L.description || ''));
        setMainUrl(String(L.media_url || ''));
        setVideoUrl(L.video_url ? String(L.video_url) : null);
        const port = L.portfolio_urls;
        setPortfolioUrls(Array.isArray(port) ? port.filter((u): u is string => typeof u === 'string') : []);
        const sk = L.soft_skills;
        setSoftSkillsText(
          Array.isArray(sk) ? sk.filter((s): s is string => typeof s === 'string').join(', ') : ''
        );
        const cc = String(L.location_country_code || '').toUpperCase();
        const cObj = countries.find((c) => c.code === cc) ?? null;
        setCountry(cObj);
        const scode = L.location_us_state_code ? String(L.location_us_state_code).toUpperCase() : '';
        if (scode && usStates.length) {
          const stObj = usStates.find((s) => s.code === scode) ?? null;
          setUsState(stObj);
        } else {
          setUsState(null);
        }
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Error', e instanceof Error ? e.message : 'Could not load listing', [
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

  const pickAndUploadImage = async (forMain: boolean) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Please allow photo library access to add images.');
      return;
    }
    if (forMain) setMainBusy(true);
    else setPortfolioBusy(true);
    setMediaUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: forMain && Platform.OS === 'ios',
        aspect: forMain && Platform.OS === 'ios' ? [4, 3] : undefined,
        quality: 0.85,
        allowsMultipleSelection: !forMain && Platform.OS !== 'web',
        selectionLimit: forMain ? 1 : 12 - portfolioUrls.length,
      });
      if (result.canceled || !result.assets?.length) return;

      const newUrls: string[] = [];
      for (const asset of result.assets) {
        if (portfolioUrls.length + newUrls.length >= 12 && !forMain) break;
        const mime = asset.mimeType ?? 'image/jpeg';
        const { url } = await apiUploadListingMedia(asset.uri, mime, (p) => setMediaUploadPct(p));
        newUrls.push(url);
      }

      if (forMain && newUrls[0]) setMainUrl(newUrls[0]);
      if (!forMain && newUrls.length) setPortfolioUrls((prev) => [...prev, ...newUrls].slice(0, 12));
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setMediaUploadPct(null);
      if (forMain) setMainBusy(false);
      else setPortfolioBusy(false);
    }
  };

  const pickAndUploadVideo = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Videos', 'Please allow media library access to attach a video.');
      return;
    }
    setVideoBusy(true);
    setMediaUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
        videoMaxDuration: 120,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'video/mp4';
      const { url, kind } = await apiUploadListingMedia(asset.uri, mime, (p) => setMediaUploadPct(p));
      if (kind !== 'video') {
        throw new Error('Please choose a video file (MP4 or MOV).');
      }
      setVideoUrl(url);
    } catch (e) {
      Alert.alert('Video upload failed', e instanceof Error ? e.message : 'Try a shorter MP4 or MOV under 45 MB.');
    } finally {
      setMediaUploadPct(null);
      setVideoBusy(false);
    }
  };

  const submit = async () => {
    if (!hasAvatar) {
      Alert.alert('Profile photo required', 'Add a profile picture in Profile & settings first.');
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
    if (!title.trim()) {
      Alert.alert('Title', 'Add a title for your listing.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description', 'Describe what you offer.');
      return;
    }
    if (!mainUrl) {
      Alert.alert('Main image', 'Add a main image for your listing.');
      return;
    }

    const skills = softSkillsText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        listing_type: listingType,
        title: title.trim(),
        description: description.trim(),
        media_url: mainUrl,
        portfolio_urls: portfolioUrls,
        soft_skills: skills,
        location_country_code: country.code,
      };
      if (country.code === usCountryCode && usState) {
        body.location_us_state_code = usState.code;
      }
      if (videoUrl) body.video_url = videoUrl;

      if (editId) {
        body.listing_id = editId;
        const data = await apiPost('listing-update.php', body, true);
        const msg =
          typeof data.message === 'string' && data.message ? data.message : 'Your listing was updated.';
        Alert.alert('Saved', msg, [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        const data = await apiPost('listing-create.php', body, true);
        const msg =
          typeof data.message === 'string' && data.message
            ? data.message
            : 'Your listing was submitted for review.';
        Alert.alert('Submitted', msg, [
          {
            text: 'OK',
            onPress: () => {
              (navigation as NativeStackNavigationProp<HomeStackParamList>).navigate('ProviderHub');
            },
          },
        ]);
      }
    } catch (e) {
      Alert.alert('Could not submit', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAvatar && !editId) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (editId && editLoading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <SafeAreaView style={styles.safe} edges={['bottom']}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <View
              style={[styles.kindPill, formCopy.kindService ? styles.kindPillService : null]}
              accessibilityRole="text"
            >
              <Text style={[styles.kindPillText, formCopy.kindService ? styles.kindPillTextService : null]}>
                {formCopy.kindLabel}
              </Text>
            </View>
            <Text style={styles.hint}>{formCopy.hint}</Text>

            <Text style={styles.label}>{formCopy.titleLabel}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={formCopy.titlePh}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />

            <Text style={styles.label}>{formCopy.descLabel}</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={formCopy.descPh}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.textArea]}
              multiline
            />

            <Text style={styles.label}>Country *</Text>
            <Pressable
              onPress={() => {
                setCountryQuery('');
                setCountryModal(true);
              }}
              style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
            >
              <Text style={country ? styles.pickerVal : styles.pickerPlaceholder}>
                {country ? country.name : locLoading ? 'Loading countries…' : 'Tap to choose country'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
            </Pressable>

            {country?.code === usCountryCode ? (
              <>
                <Text style={styles.label}>U.S. state *</Text>
                <Pressable
                  onPress={() => {
                    setStateQuery('');
                    setStateModal(true);
                  }}
                  style={({ pressed }) => [styles.pickerRow, pressed && styles.pickerRowPressed]}
                >
                  <Text style={usState ? styles.pickerVal : styles.pickerPlaceholder}>
                    {usState ? `${usState.name} (${usState.code})` : 'Tap to choose state'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
                </Pressable>
              </>
            ) : null}

            <Text style={styles.label}>Main image *</Text>
            <MediaUploadZone
              variant="hero"
              onPress={() => void pickAndUploadImage(true)}
              loading={mainBusy}
              disabled={mainBusy}
              imageUrl={mainUrl}
              title={mainUrl ? 'Replace main photo' : 'Tap to upload photo'}
              subtitle={
                listingType === 'service'
                  ? 'Cover image — buyers see this first'
                  : 'Primary photo for your classified or service listing'
              }
              mediaType="image"
            />
            {mainBusy ? (
              <Text style={styles.uploadPctText}>
                {mediaUploadPct != null ? `Uploading main image… ${mediaUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}
            <Text style={styles.micro}>{formCopy.mainMicro}</Text>

            <Text style={styles.label}>Video (optional)</Text>
            <MediaUploadZone
              variant="wide"
              onPress={() => void pickAndUploadVideo()}
              loading={videoBusy}
              disabled={videoBusy}
              mediaType="video"
              title={videoUrl ? 'Replace video' : 'Tap to upload video'}
              subtitle={
                videoUrl
                  ? 'MP4 or MOV · up to 45 MB — tap to pick a different file'
                  : formCopy.videoMicro
              }
            />
            {videoBusy ? (
              <Text style={styles.uploadPctText}>
                {mediaUploadPct != null ? `Uploading video… ${mediaUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}
            {videoUrl ? (
              <Pressable
                onPress={() => setVideoUrl(null)}
                style={({ pressed }) => [styles.videoRemoveRow, pressed && styles.pickerRowPressed]}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
                <Text style={styles.videoRemoveLabel}>Remove video</Text>
              </Pressable>
            ) : null}

            <Text style={styles.label}>{formCopy.portfolioLabel}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ph}>
              {portfolioUrls.map((url) => (
                <View key={url} style={styles.thumbWrap}>
                  <RemoteImage url={url} style={styles.thumb} contentFit="cover" />
                  <Pressable
                    onPress={() => setPortfolioUrls((prev) => prev.filter((u) => u !== url))}
                    style={styles.thumbX}
                  >
                    <Ionicons name="close" size={16} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {portfolioUrls.length < 12 ? (
                <MediaUploadZone
                  variant="compact"
                  onPress={() => void pickAndUploadImage(false)}
                  loading={portfolioBusy}
                  disabled={portfolioBusy}
                  title="Add photos"
                  subtitle="Tap to upload"
                  mediaType="image"
                  style={styles.portfolioAddZone}
                />
              ) : null}
            </ScrollView>
            {portfolioBusy ? (
              <Text style={styles.uploadPctText}>
                {mediaUploadPct != null ? `Uploading portfolio… ${mediaUploadPct}%` : 'Starting…'}
              </Text>
            ) : null}
            <Text style={styles.micro}>{formCopy.portfolioMicro}</Text>

            <Text style={styles.label}>{formCopy.skillsLabel}</Text>
            <TextInput
              value={softSkillsText}
              onChangeText={setSoftSkillsText}
              placeholder={formCopy.skillsPh}
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
            <Text style={styles.micro}>{formCopy.skillsMicro}</Text>

            <View style={styles.spacer} />
            <PrimaryButton
              label={
                submitting
                  ? editId
                    ? 'Saving…'
                    : 'Submitting…'
                  : editId
                    ? 'Save changes'
                    : listingType === 'service'
                      ? 'Submit service listing'
                      : 'Submit classified ad'
              }
              loading={submitting}
              onPress={() => void submit()}
            />
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>

      <Modal visible={countryModal} animationType="slide" onRequestClose={() => setCountryModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Country</Text>
            <Pressable onPress={() => setCountryModal(false)} hitSlop={12}>
              <Text style={styles.modalDone}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            value={countryQuery}
            onChangeText={setCountryQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={styles.modalSearch}
          />
          <FlatList
            data={filteredCountries}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setCountry(item);
                  if (item.code !== usCountryCode) setUsState(null);
                  setCountryModal(false);
                }}
                style={({ pressed }) => [styles.modalRow, pressed && styles.pickerRowPressed]}
              >
                <Text style={styles.modalRowText}>{item.name}</Text>
                <Text style={styles.modalRowSub}>{item.code}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={stateModal} animationType="slide" onRequestClose={() => setStateModal(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>U.S. state</Text>
            <Pressable onPress={() => setStateModal(false)} hitSlop={12}>
              <Text style={styles.modalDone}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            value={stateQuery}
            onChangeText={setStateQuery}
            placeholder="Search"
            placeholderTextColor={colors.textMuted}
            style={styles.modalSearch}
          />
          <FlatList
            data={filteredStates}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setUsState(item);
                  setStateModal(false);
                }}
                style={({ pressed }) => [styles.modalRow, pressed && styles.pickerRowPressed]}
              >
                <Text style={styles.modalRowText}>{item.name}</Text>
                <Text style={styles.modalRowSub}>{item.code}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: 20, paddingBottom: 36, paddingTop: 8 },
  kindPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(31, 170, 242, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.4)',
    marginBottom: 12,
  },
  kindPillService: {
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    borderColor: 'rgba(15, 118, 110, 0.4)',
  },
  kindPillText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark, letterSpacing: 0.3 },
  kindPillTextService: { color: '#0f766e' },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  textArea: { minHeight: 120, textAlignVertical: 'top' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  pickerRowPressed: { opacity: 0.9 },
  pickerVal: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1, paddingRight: 8 },
  pickerPlaceholder: { fontSize: 16, fontWeight: '600', color: colors.textMuted, flex: 1, paddingRight: 8 },
  videoRemoveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: 'rgba(220, 38, 38, 0.06)',
  },
  videoRemoveLabel: { fontSize: 14, fontWeight: '800', color: colors.danger },
  micro: { marginTop: 6, fontSize: 12, color: colors.textMuted, fontWeight: '500' },
  uploadPctText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  ph: { gap: 10, paddingVertical: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: 14, backgroundColor: colors.cardBorder },
  thumbX: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(11,18,32,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioAddZone: { width: 112, minHeight: 96 },
  spacer: { height: 8 },
  modalSafe: { flex: 1, backgroundColor: colors.bgTop },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  modalDone: { fontSize: 16, fontWeight: '800', color: colors.primaryDark },
  modalSearch: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.card,
  },
  modalRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalRowText: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  modalRowSub: { fontSize: 13, fontWeight: '700', color: colors.textMuted },
});

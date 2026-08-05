import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
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
import { CommonActions, useFocusEffect } from '@react-navigation/native';
import { apiGet, apiLogout, apiPost, apiUploadAvatar, setStoredToken } from '../api/client';
import { AppPasswordField } from '../components/AppPasswordField';
import { GlassCard } from '../components/GlassCard';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { RemoteImage } from '../components/RemoteImage';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList, ProfileStackParamList } from '../navigation/types';

type ExploreKey = 'Classifieds' | 'Services' | 'ProductsBrowse' | 'Stores' | 'Directory';

const BROWSE_LINKS: { route: ExploreKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: 'Classifieds', label: 'Classified marketplace', icon: 'grid-outline' },
  { route: 'Services', label: 'Service marketplace', icon: 'briefcase-outline' },
  { route: 'ProductsBrowse', label: 'Shop products', icon: 'pricetag-outline' },
  { route: 'Stores', label: 'Online stores', icon: 'storefront-outline' },
  { route: 'Directory', label: 'Business directory', icon: 'business-outline' },
];

import { colors } from '../theme/colors';

const PROFILE_CARD_W = Math.min((Dimensions.get('window').width - 40 - 12) / 2, 180);

type OwnListing = {
  id: number;
  listing_type: string;
  title: string;
  moderation_status: string;
  display_image_url: string | null;
  media_url: string | null;
  price_amount: string | null;
  pricing_type: string;
  currency: string;
  views_total?: number;
  views_7d?: number;
};

type MenuRowProps = {
  label: string;
  subtitle?: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  chevron?: boolean;
  danger?: boolean;
  last?: boolean;
  disabled?: boolean;
};

function MenuRow({
  label,
  subtitle,
  onPress,
  icon,
  chevron = true,
  danger,
  last,
  disabled,
}: MenuRowProps) {
  const showChevron = chevron && !!onPress && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      style={({ pressed }) => [
        menuRowStyles.row,
        last && menuRowStyles.rowLast,
        pressed && onPress && !disabled && menuRowStyles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primaryDark} />
      ) : (
        <View style={menuRowStyles.iconSpacer} />
      )}
      <View style={menuRowStyles.body}>
        <Text style={[menuRowStyles.label, danger && menuRowStyles.labelDanger]}>{label}</Text>
        {subtitle ? <Text style={menuRowStyles.sub}>{subtitle}</Text> : null}
      </View>
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

function MenuDivider() {
  return <View style={menuRowStyles.divider} />;
}

type Props =
  | NativeStackScreenProps<HomeStackParamList, 'Profile'>
  | NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

function formatCardBrand(brand: string | null | undefined): string {
  if (!brand) return 'Card';
  const b = brand.toLowerCase();
  const map: Record<string, string> = {
    visa: 'Visa',
    mastercard: 'Mastercard',
    amex: 'American Express',
    discover: 'Discover',
    unionpay: 'UnionPay',
    jcb: 'JCB',
    diners: 'Diners Club',
  };
  return map[b] ?? brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
}

export function ProfileSettingsScreen({ navigation }: Props) {
  const { user, subscription, refreshProfile, stackNavigation, supportAvailable, supportEmail } =
    useDashboardContext();
  const monetizationOn = subscription?.monetization_enabled === true;
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarUploadPct, setAvatarUploadPct] = useState<number | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdBusy, setPwdBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delEmail, setDelEmail] = useState('');
  const [delPhone, setDelPhone] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [ownListings, setOwnListings] = useState<OwnListing[]>([]);

  const avatarUri =
    user?.avatar_url && String(user.avatar_url).trim() !== '' ? String(user.avatar_url) : null;
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Member';
  const accountEmail = user?.email?.trim() || '—';
  const accountPhone = user?.phone?.trim() || '—';
  const accountUsername = user?.username?.trim() || '';
  const planLabel =
    subscription?.plan_title?.trim() ||
    (user?.membership_plan && user.membership_plan !== 'free' ? user.membership_plan : '') ||
    'Member';
  const isVerified = user?.status === 'verified';
  const roleLabel =
    user?.registration_account_type === 'business'
      ? 'Business'
      : user?.registration_account_type === 'individual'
        ? 'Member'
        : 'Member';
  const profileSubtitle = [roleLabel, accountUsername ? `@${accountUsername}` : null].filter(Boolean).join(' · ');

  const myServices = useMemo(
    () => ownListings.filter((l) => l.listing_type === 'service').slice(0, 6),
    [ownListings]
  );
  const myClassifieds = useMemo(
    () => ownListings.filter((l) => l.listing_type === 'classified').slice(0, 6),
    [ownListings]
  );

  const showAccountEdit = () => {
    navigation.navigate('EditAccount');
  };

  const openListing = (id: number) => {
    stackNavigation.navigate('Dashboard', {
      screen: 'HomeTab',
      params: { screen: 'ListingDetail', params: { id }, initial: false },
    });
  };

  const formatOwnPrice = (row: OwnListing) => {
    if (!row.price_amount) return null;
    const cur = row.currency === 'USD' ? '$' : `${row.currency} `;
    const suffix = row.pricing_type === 'hourly' ? '/hr' : '';
    return `${cur}${row.price_amount}${suffix}`;
  };

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
      let cancelled = false;
      (async () => {
        try {
          const data = await apiGet('my-listings.php', true);
          if (cancelled || !Array.isArray(data.listings)) return;
          const next: OwnListing[] = [];
          for (const row of data.listings) {
            if (row == null || typeof row !== 'object') continue;
            const o = row as Record<string, unknown>;
            const id = Number(o.id);
            if (!id) continue;
            next.push({
              id,
              listing_type: String(o.listing_type ?? ''),
              title: String(o.title ?? ''),
              moderation_status: String(o.moderation_status ?? ''),
              display_image_url: o.display_image_url ? String(o.display_image_url) : null,
              media_url: o.media_url ? String(o.media_url) : null,
              price_amount: o.price_amount != null && o.price_amount !== '' ? String(o.price_amount) : null,
              pricing_type: String(o.pricing_type ?? 'fixed'),
              currency: String(o.currency ?? 'USD'),
            });
          }
          setOwnListings(next);
        } catch {
          if (!cancelled) setOwnListings([]);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [refreshProfile])
  );

  const goExplore = (screen: ExploreKey) => {
    stackNavigation.navigate('Dashboard', {
      screen: 'HomeTab',
      params: { screen },
    });
  };

  const goOffice = () => {
    stackNavigation.navigate('Dashboard', {
      screen: 'OfficeTab',
      params: { screen: 'MyOffice' },
    });
  };

  const openAddCardInApp = () => {
    stackNavigation.navigate('AddPaymentCard', {
      returnTo: 'pop',
      email: typeof user?.email === 'string' ? user.email : undefined,
    });
  };

  const confirmRemovePaymentMethod = () => {
    Alert.alert(
      'Remove payment method?',
      'Without a card on file we cannot renew your membership when your current access or trial ends. Listings that depend on an active paid plan may go offline when that period expires. You can add a new card anytime before then.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove card',
          style: 'destructive',
          onPress: () => void removePaymentMethod(),
        },
      ]
    );
  };

  const removePaymentMethod = async () => {
    setBillingBusy(true);
    try {
      await apiPost('billing-payment-method-remove.php', {}, true);
      await refreshProfile();
      Alert.alert('Payment method', 'Your card was removed from this account.');
    } catch (e) {
      Alert.alert('Could not remove card', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBillingBusy(false);
    }
  };

  const signOut = async () => {
    await apiLogout();
    stackNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
  };

  const confirmSignOut = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => void signOut(),
      },
    ]);
  };

  const pickAvatar = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', 'Please allow photo library access to set a profile picture.');
      return;
    }
    setAvatarBusy(true);
    setAvatarUploadPct(0);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: Platform.OS === 'ios',
        aspect: Platform.OS === 'ios' ? [1, 1] : undefined,
        quality: 0.85,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];
      const mime = asset.mimeType ?? 'image/jpeg';
      await apiUploadAvatar(asset.uri, mime, (p) => setAvatarUploadPct(p));
      await refreshProfile();
      Alert.alert('Profile photo', 'Your picture was updated.');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setAvatarBusy(false);
      setAvatarUploadPct(null);
    }
  };

  const submitPassword = async () => {
    if (newPassword.length < 8) {
      Alert.alert('Password', 'New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Password', 'New password and confirmation do not match.');
      return;
    }
    setPwdBusy(true);
    try {
      await apiPost(
        'change-password.php',
        { current_password: currentPassword, new_password: newPassword },
        true
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Password', 'Your password was changed.');
    } catch (e) {
      Alert.alert('Could not change password', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setPwdBusy(false);
    }
  };

  const openDeleteModal = () => {
    setDelEmail('');
    setDelPhone('');
    setDeleteOpen(true);
  };

  const submitDelete = async () => {
    setDeleteBusy(true);
    try {
      await apiPost(
        'delete-account.php',
        {
          confirm_email: delEmail.trim().toLowerCase(),
          confirm_phone: delPhone.trim(),
        },
        true
      );
      await setStoredToken(null);
      setDeleteOpen(false);
      stackNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
    } catch (e) {
      Alert.alert('Could not delete account', e instanceof Error ? e.message : 'Check email and phone.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Pressable
                onPress={() => void pickAvatar()}
                disabled={avatarBusy}
                style={({ pressed }) => [styles.avatarHeroWrap, pressed && styles.pressed]}
                accessibilityLabel="Change profile photo"
              >
                <View style={styles.avatarHero}>
                  {avatarUri ? (
                    <RemoteImage
                      url={avatarUri}
                      style={styles.avatarHeroImg}
                      contentFit="cover"
                      accessibilityLabel="Your profile photo"
                    />
                  ) : (
                    <Ionicons name="person" size={42} color={colors.primaryDark} />
                  )}
                </View>
                {isVerified ? (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                ) : null}
              </Pressable>
              <Text style={styles.heroName}>{displayName}</Text>
              <Text style={styles.heroSub}>{profileSubtitle}</Text>
              {monetizationOn ? <Text style={styles.profilePlan}>{planLabel}</Text> : null}
              <Pressable
                onPress={showAccountEdit}
                style={({ pressed }) => [styles.editProfileBtn, pressed && styles.pressed]}
              >
                <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              </Pressable>
            </View>

            {myServices.length > 0 ? (
              <View style={styles.listingSection}>
                <View style={styles.listingSectionHead}>
                  <Text style={styles.listingSectionTitle}>My Services</Text>
                  <Pressable onPress={goOffice} hitSlop={8}>
                    <Text style={styles.seeAll}>See All {'>'}</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listingRail}>
                  {myServices.map((row) => {
                    const img = row.display_image_url || row.media_url;
                    const price = formatOwnPrice(row);
                    return (
                      <Pressable
                        key={`svc-${row.id}`}
                        style={({ pressed }) => [styles.listingCard, pressed && styles.pressed]}
                        onPress={() => openListing(row.id)}
                      >
                        <View style={styles.listingImgWrap}>
                          {img ? (
                            <RemoteImage url={img} style={styles.listingImg} contentFit="cover" />
                          ) : (
                            <View style={[styles.listingImg, styles.listingImgPh]}>
                              <Ionicons name="briefcase-outline" size={28} color={colors.textMuted} />
                            </View>
                          )}
                        </View>
                        <Text style={styles.listingTitle} numberOfLines={1}>
                          {row.title}
                        </Text>
                        {price ? (
                          <Text style={styles.listingPrice}>Starting at {price}</Text>
                        ) : (
                          <Text style={styles.listingPriceMuted}>View listing</Text>
                        )}
                        <Text style={styles.listingViews}>{row.views_total ?? 0} views</Text>
                        <View style={styles.listingCta}>
                          <Text style={styles.listingCtaText}>View</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            {myClassifieds.length > 0 ? (
              <View style={styles.listingSection}>
                <View style={styles.listingSectionHead}>
                  <Text style={styles.listingSectionTitle}>My Listings</Text>
                  <Pressable onPress={goOffice} hitSlop={8}>
                    <Text style={styles.seeAll}>See All {'>'}</Text>
                  </Pressable>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.listingRail}>
                  {myClassifieds.map((row) => {
                    const img = row.display_image_url || row.media_url;
                    const price = formatOwnPrice(row);
                    return (
                      <Pressable
                        key={`cls-${row.id}`}
                        style={({ pressed }) => [styles.listingCard, pressed && styles.pressed]}
                        onPress={() => openListing(row.id)}
                      >
                        <View style={styles.listingImgWrap}>
                          {img ? (
                            <RemoteImage url={img} style={styles.listingImgSquare} contentFit="cover" />
                          ) : (
                            <View style={[styles.listingImgSquare, styles.listingImgPh]}>
                              <Ionicons name="pricetag-outline" size={28} color={colors.textMuted} />
                            </View>
                          )}
                        </View>
                        <Text style={styles.listingTitle} numberOfLines={2}>
                          {row.title}
                        </Text>
                        {price ? <Text style={styles.listingPrice}>{price}</Text> : null}
                        <Text style={styles.listingViews}>{row.views_total ?? 0} views</Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}

            <Text style={styles.settingsHeading}>Account & settings</Text>

            <GlassCard style={[styles.card, styles.menuCard]}>
              <MenuRow
                icon="person-outline"
                label="Full name"
                subtitle={displayName}
                onPress={showAccountEdit}
              />
              <MenuRow
                icon="mail-outline"
                label="Email"
                subtitle={accountEmail}
                onPress={showAccountEdit}
              />
              <MenuRow
                icon="call-outline"
                label="Phone"
                subtitle={accountPhone}
                onPress={showAccountEdit}
                last
              />
            </GlassCard>

            <GlassCard style={[styles.card, styles.menuCard]}>
              <MenuRow
                icon="briefcase-outline"
                label="Manage my listings & office"
                subtitle="Listings, store, products, and directory"
                onPress={goOffice}
              />
              <MenuDivider />
              {BROWSE_LINKS.map((item, i) => (
                <MenuRow
                  key={item.route}
                  icon={item.icon}
                  label={item.label}
                  onPress={() => goExplore(item.route)}
                  last={i === BROWSE_LINKS.length - 1}
                />
              ))}
            </GlassCard>

            {monetizationOn
              ? (() => {
              const plan = subscription?.plan ?? 'free';
              const planTitle =
                subscription?.plan_title && String(subscription.plan_title).trim() !== ''
                  ? String(subscription.plan_title).trim()
                  : 'your plan';
              const trialDays =
                typeof subscription?.trial_days === 'number' && subscription.trial_days > 0
                  ? subscription.trial_days
                  : 90;
              const pm = subscription?.stripe_payment_method_status ?? 'none';
              const card = subscription?.payment_method;
              const last4 = typeof card?.last4 === 'string' ? card.last4.trim() : '';
              const hasCard = pm === 'attached' || last4.length >= 4;
              const cardLabel = hasCard
                ? last4
                  ? `${formatCardBrand(card?.brand)} ···· ${last4}`
                  : 'Card on file'
                : plan === 'free'
                  ? 'None — free plan'
                  : 'Not on file';
              const billingHint = plan !== 'free'
                ? `No charge today. Card kept for billing after your ${trialDays}-day trial on ${planTitle}. Stripe opens in your browser.`
                : 'No membership charges on the free plan. Add a card anytime before upgrading.';

              return (
                <GlassCard style={[styles.card, styles.menuCard]}>
                  <Text style={styles.menuSectionLabel}>Payment method</Text>
                  <Text style={styles.menuSectionHint}>{billingHint}</Text>
                  <MenuRow icon="card-outline" label="Card on file" subtitle={cardLabel} chevron={false} />
                  <MenuDivider />
                  <MenuRow
                    icon="create-outline"
                    label={hasCard ? 'Update payment method' : 'Add card'}
                    onPress={openAddCardInApp}
                    last={!hasCard}
                  />
                  {hasCard ? (
                    <MenuRow
                      icon="trash-outline"
                      label="Remove card"
                      onPress={confirmRemovePaymentMethod}
                      disabled={billingBusy}
                      danger
                      last
                    />
                  ) : null}
                </GlassCard>
              );
            })()
              : null}

            <GlassCard style={[styles.card, styles.menuCard]}>
              <MenuRow
                icon="camera-outline"
                label="Profile photo"
                subtitle={
                  avatarBusy
                    ? avatarUploadPct != null && avatarUploadPct > 0 && avatarUploadPct < 100
                      ? `Uploading… ${avatarUploadPct}%`
                      : 'Preparing…'
                    : 'Shown on Home and your public profile'
                }
                onPress={() => void pickAvatar()}
                disabled={avatarBusy}
              />
              <MenuDivider />
              <MenuRow
                icon="lock-closed-outline"
                label="Change password"
                subtitle={passwordOpen ? 'Tap to hide' : 'Update your sign-in password'}
                onPress={() => setPasswordOpen((v) => !v)}
                chevron={false}
                last={!passwordOpen}
              />
              {passwordOpen ? (
                <View style={styles.passwordPanel}>
                  <AppPasswordField
                    label="Current password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <AppPasswordField
                    label="New password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <AppPasswordField
                    label="Confirm new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <PrimaryButton
                    label="Update password"
                    onPress={() => void submitPassword()}
                    loading={pwdBusy}
                    style={styles.passwordBtn}
                  />
                </View>
              ) : null}
            </GlassCard>

            <GlassCard style={[styles.card, styles.menuCard]}>
              {supportAvailable && user ? (
                <>
                  <MenuRow
                    icon="chatbubble-ellipses-outline"
                    label="Message support"
                    subtitle="Questions about your account or listings"
                    onPress={() => stackNavigation.navigate('SupportChat', {})}
                  />
                  <MenuDivider />
                </>
              ) : null}
              <MenuRow
                icon="log-out-outline"
                label="Log out"
                onPress={confirmSignOut}
                danger
                last
              />
            </GlassCard>

            <Pressable
              onPress={openDeleteModal}
              accessibilityRole="button"
              accessibilityLabel="Delete my account"
              android_ripple={{ color: 'rgba(220, 38, 38, 0.12)', borderless: false }}
              style={({ pressed }) => [styles.deleteAccount, pressed && styles.pressed]}
            >
              <View style={styles.deleteIconWrap}>
                <Ionicons name="warning-outline" size={22} color={colors.danger} />
              </View>
              <View style={styles.deleteBody}>
                <Text style={styles.deleteTitle}>Delete my account</Text>
                <Text style={styles.deleteSub}>
                  Permanently removes your profile, listings, and messages
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={deleteOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !deleteBusy && setDeleteOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[StyleSheet.absoluteFillObject, styles.modalDim]}
            onPress={() => !deleteBusy && setDeleteOpen(false)}
          />
          <View style={styles.modalCenter} pointerEvents="box-none">
            <View style={styles.modalCard}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="warning" size={32} color={colors.danger} />
              </View>
              <Text style={styles.modalTitle}>Delete account?</Text>
              <Text style={styles.modalWarn}>
                This cannot be undone. Enter the email and phone number on your account to confirm.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Email address"
                placeholderTextColor={colors.textMuted}
                value={delEmail}
                onChangeText={setDelEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deleteBusy}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone number"
                placeholderTextColor={colors.textMuted}
                value={delPhone}
                onChangeText={setDelPhone}
                keyboardType="phone-pad"
                editable={!deleteBusy}
              />
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => setDeleteOpen(false)}
                  disabled={deleteBusy}
                  style={({ pressed }) => [styles.modalCancel, pressed && styles.pressed]}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void submitDelete()}
                  disabled={deleteBusy}
                  style={({ pressed }) => [styles.modalDelete, pressed && styles.pressed]}
                >
                  <Text style={styles.modalDeleteText}>{deleteBusy ? 'Deleting…' : 'Delete forever'}</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </GradientBackground>
  );
}

const menuRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLast: { borderBottomWidth: 0 },
  iconSpacer: { width: 22 },
  body: { flex: 1, minWidth: 0 },
  label: { fontSize: 16, fontWeight: '700', color: colors.text },
  labelDanger: { color: colors.danger },
  sub: { marginTop: 3, fontSize: 13, lineHeight: 18, color: colors.textMuted, fontWeight: '500' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginVertical: 2 },
  pressed: { opacity: 0.88 },
});

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  hero: { alignItems: 'center', marginBottom: 22, paddingTop: 8 },
  avatarHeroWrap: { position: 'relative', marginBottom: 12 },
  avatarHero: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: colors.white,
  },
  avatarHeroImg: { width: 96, height: 96, borderRadius: 48 },
  verifiedBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  heroName: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center' },
  heroSub: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
    textAlign: 'center',
  },
  profilePlan: { marginTop: 6, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  editProfileBtn: {
    marginTop: 14,
    minWidth: 200,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 14,
    backgroundColor: colors.sand,
    alignItems: 'center',
  },
  editProfileBtnText: { fontSize: 15, fontWeight: '800', color: colors.text },
  listingSection: { marginBottom: 22 },
  listingSectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listingSectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  seeAll: { fontSize: 14, fontWeight: '800', color: colors.primary },
  listingRail: { gap: 12, paddingRight: 8 },
  listingCard: {
    width: PROFILE_CARD_W,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.06)',
  },
  listingImgWrap: { overflow: 'hidden' },
  listingImg: { width: '100%', aspectRatio: 16 / 10, backgroundColor: colors.primarySoft },
  listingImgSquare: { width: '100%', aspectRatio: 1, backgroundColor: colors.primarySoft },
  listingImgPh: { alignItems: 'center', justifyContent: 'center' },
  listingTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 4,
  },
  listingPrice: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  listingPriceMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  listingViews: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  listingCta: {
    marginHorizontal: 10,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  listingCtaText: { fontSize: 13, fontWeight: '800', color: colors.white },
  settingsHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  menuCard: { paddingVertical: 8, paddingHorizontal: 16, overflow: 'hidden' },
  menuSectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  menuSectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '500',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  passwordPanel: { paddingTop: 8, paddingBottom: 12, paddingHorizontal: 4 },
  passwordBtn: { marginTop: 8 },
  card: { marginBottom: 14 },
  deleteAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.28)',
    backgroundColor: colors.card,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  deleteIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBody: { flex: 1, minWidth: 0 },
  deleteTitle: { fontSize: 16, fontWeight: '800', color: colors.danger },
  deleteSub: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    fontWeight: '500',
  },
  pressed: { opacity: 0.88 },
  modalRoot: { flex: 1 },
  modalDim: { backgroundColor: 'rgba(11, 18, 32, 0.55)' },
  modalCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 22,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: 'rgba(220, 38, 38, 0.45)',
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
  },
  modalIconWrap: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.danger, textAlign: 'center' },
  modalWarn: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 16,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(11, 18, 32, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    marginBottom: 12,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(11, 18, 32, 0.06)',
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 15, fontWeight: '700', color: colors.text },
  modalDelete: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center',
  },
  modalDeleteText: { fontSize: 15, fontWeight: '800', color: colors.white },
});

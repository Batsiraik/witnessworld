import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
  Alert,
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
import { apiLogout, apiPost, apiUploadAvatar, setStoredToken } from '../api/client';
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

  const showAccountEdit = () => {
    navigation.navigate('EditAccount');
  };

  useFocusEffect(
    useCallback(() => {
      void refreshProfile();
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
            <Text style={styles.pageTitle}>Profile & settings</Text>

            <GlassCard style={[styles.card, styles.menuCard]}>
              <View style={styles.profileHead}>
                <Pressable
                  onPress={() => void pickAvatar()}
                  disabled={avatarBusy}
                  style={({ pressed }) => [pressed && styles.pressed]}
                >
                  <View style={styles.avatarCompact}>
                    {avatarUri ? (
                      <RemoteImage
                        url={avatarUri}
                        style={styles.avatarImgCompact}
                        contentFit="cover"
                        accessibilityLabel="Your profile photo"
                      />
                    ) : (
                      <Ionicons name="person" size={28} color={colors.primaryDark} />
                    )}
                  </View>
                </Pressable>
                <View style={styles.profileHeadText}>
                  <Text style={styles.profileName}>{displayName}</Text>
                  <Text style={styles.profileMeta}>{accountEmail}</Text>
                  {accountUsername ? (
                    <Text style={styles.profileMeta}>@{accountUsername}</Text>
                  ) : null}
                  {monetizationOn ? <Text style={styles.profilePlan}>{planLabel}</Text> : null}
                </View>
              </View>
              <MenuDivider />
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
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
  menuCard: { paddingVertical: 8, paddingHorizontal: 16, overflow: 'hidden' },
  profileHead: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, paddingHorizontal: 4 },
  profileHeadText: { flex: 1, minWidth: 0 },
  profileName: { fontSize: 18, fontWeight: '800', color: colors.text },
  profileMeta: { marginTop: 3, fontSize: 14, color: colors.textMuted, fontWeight: '500' },
  profilePlan: { marginTop: 6, fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  avatarCompact: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarImgCompact: { width: 56, height: 56, borderRadius: 28 },
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

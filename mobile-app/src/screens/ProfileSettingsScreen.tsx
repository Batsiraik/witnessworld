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

export function ProfileSettingsScreen(_props: Props) {
  const { user, subscription, refreshProfile, stackNavigation, supportAvailable, supportEmail } =
    useDashboardContext();
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

  const avatarUri =
    user?.avatar_url && String(user.avatar_url).trim() !== '' ? String(user.avatar_url) : null;
  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Member';

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
            <Text style={styles.pageSub}>{displayName}</Text>

            <PrimaryButton label="Manage my listings & office" onPress={goOffice} style={styles.manageCta} />
            <Text style={styles.manageCtaHint}>Listings, store, products, and directory — same place as My office below.</Text>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Payment method</Text>
              {(() => {
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

                const billingHint = plan !== 'free'
                  ? `You will not be charged today. We only keep your card on file so billing can start after your ${trialDays}-day free trial ends, if you stay on ${planTitle}. Add or update your card in Stripe (opens in your browser).`
                  : 'Free plan — no membership charges. You can still add a card anytime before upgrading.';

                return (
                  <>
              <Text style={styles.sectionHint}>{billingHint}</Text>
              {(() => {
                if (hasCard) {
                  return (
                    <View style={styles.paymentBlock}>
                      <Text style={styles.paymentMain}>
                        {last4 ? `${formatCardBrand(card?.brand)} ···· ${last4}` : 'Card on file'}
                      </Text>
                      <PrimaryButton
                        label="Update payment method"
                        onPress={openAddCardInApp}
                        style={styles.paymentBtn}
                      />
                      <PrimaryButton
                        label="Remove card"
                        variant="outline"
                        onPress={confirmRemovePaymentMethod}
                        disabled={billingBusy}
                        style={styles.paymentBtn}
                      />
                    </View>
                  );
                }
                return (
                  <View style={styles.paymentBlock}>
                    <Text style={styles.paymentMain}>{plan === 'free' ? 'None' : 'Not on file'}</Text>
                    <Text style={styles.paymentSub}>
                      {plan === 'free'
                        ? 'No card required on the free plan. Add one now if you plan to upgrade later.'
                        : `No card on file yet. Add one to use ${planTitle} during your ${trialDays}-day trial — we will not charge a penny until the trial ends.`}
                    </Text>
                    <PrimaryButton label="Add card" onPress={openAddCardInApp} style={styles.paymentBtn} />
                  </View>
                );
              })()}
                  </>
                );
              })()}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Browse marketplace</Text>
              <Text style={styles.sectionHint}>Jump to a marketplace from your profile.</Text>
              {BROWSE_LINKS.map((item, i) => (
                <Pressable
                  key={item.route}
                  onPress={() => goExplore(item.route)}
                  style={({ pressed }) => [
                    styles.linkRow,
                    i === BROWSE_LINKS.length - 1 && styles.linkRowLast,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name={item.icon} size={22} color={colors.primaryDark} />
                  <Text style={styles.linkRowLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Account</Text>
              <Pressable
                onPress={goOffice}
                style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}
              >
                <Ionicons name="briefcase-outline" size={22} color={colors.primaryDark} />
                <Text style={styles.linkRowLabel}>My office</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
              <Pressable
                onPress={confirmSignOut}
                style={({ pressed }) => [styles.logoutRow, pressed && styles.pressed]}
              >
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
                <Text style={styles.logoutRowText}>Log out</Text>
              </Pressable>
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Profile photo</Text>
              <Text style={styles.sectionHint}>Shown on Home and on your profile.</Text>
              <Pressable
                onPress={() => void pickAvatar()}
                disabled={avatarBusy}
                style={({ pressed }) => [styles.avatarRow, pressed && styles.pressed]}
              >
                <View style={styles.avatarLarge}>
                  {avatarUri ? (
                    <RemoteImage
                      url={avatarUri}
                      style={styles.avatarImgLarge}
                      contentFit="cover"
                      accessibilityLabel="Your profile photo"
                    />
                  ) : (
                    <Ionicons name="person" size={44} color={colors.primaryDark} />
                  )}
                </View>
              </Pressable>
              <Pressable
                onPress={() => void pickAvatar()}
                disabled={avatarBusy}
                style={styles.changePhotoBtn}
              >
                <Text style={styles.changePhotoText}>
                  {avatarBusy
                    ? avatarUploadPct != null && avatarUploadPct > 0 && avatarUploadPct < 100
                      ? `Uploading… ${avatarUploadPct}%`
                      : 'Preparing…'
                    : 'Choose photo'}
                </Text>
              </Pressable>
            </GlassCard>

            <GlassCard style={styles.card}>
              <Text style={styles.sectionTitle}>Change password</Text>
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
              />
            </GlassCard>

            {supportAvailable && user ? (
              <GlassCard style={styles.card}>
                <Text style={styles.sectionTitle}>Customer support</Text>
                <Text style={styles.sectionHint}>Questions about your account or listings? Chat with our team.</Text>
                <PrimaryButton
                  label="Message support"
                  variant="outline"
                  onPress={() => stackNavigation.navigate('SupportChat', {})}
                />
              </GlassCard>
            ) : null}

            <GlassCard style={[styles.card, styles.dangerCard]}>
              <Text style={styles.dangerTitle}>Delete account</Text>
              <Text style={styles.dangerBody}>
                This permanently removes your profile, listings, and messages. This cannot be undone.
              </Text>
              <PrimaryButton
                label="Delete my account…"
                variant="outline"
                onPress={openDeleteModal}
              />
            </GlassCard>

            <View style={styles.nbBox}>
              <Text style={styles.nbLabel}>NB</Text>
              <Text style={styles.nbText}>
                To change your name, email, or phone on the WWC App, Please contact the administrator
                {supportEmail ? ` at ${supportEmail}` : ''}. Or send a message to the Support in App Chat. These details cannot be updated from the app.
              </Text>
            </View>
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

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: colors.text },
  pageSub: { fontSize: 14, color: colors.textMuted, marginTop: 4, marginBottom: 8, fontWeight: '500' },
  manageCta: { marginTop: 8 },
  manageCtaHint: {
    marginTop: 10,
    marginBottom: 4,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  nbBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(217, 119, 6, 0.35)',
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  nbLabel: { fontSize: 12, fontWeight: '900', color: '#B45309', letterSpacing: 0.5 },
  nbText: { flex: 1, fontSize: 13, lineHeight: 20, color: colors.text, fontWeight: '600' },
  paymentBlock: { marginTop: 4 },
  paymentMain: { fontSize: 16, fontWeight: '800', color: colors.text, marginTop: 8 },
  paymentSub: { marginTop: 8, fontSize: 13, lineHeight: 20, color: colors.textMuted, fontWeight: '600' },
  paymentBtn: { marginTop: 12 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 18, 32, 0.08)',
  },
  linkRowLast: { borderBottomWidth: 0 },
  linkRowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  logoutRowText: { fontSize: 16, fontWeight: '700', color: colors.danger },
  accountRowPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 170, 242, 0.1)',
    marginBottom: 10,
  },
  accountRowPrimaryText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  accountRowSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 170, 242, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(31, 170, 242, 0.35)',
  },
  accountRowSecondaryText: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  card: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  sectionHint: { fontSize: 13, color: colors.textMuted, marginBottom: 14, fontWeight: '500' },
  avatarRow: { alignSelf: 'center', marginBottom: 12 },
  avatarLarge: {
    width: 112,
    height: 112,
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarImgLarge: { width: 112, height: 112, borderRadius: 36 },
  changePhotoBtn: { alignSelf: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  changePhotoText: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
  dangerCard: {
    borderColor: 'rgba(220, 38, 38, 0.35)',
    backgroundColor: 'rgba(254, 226, 226, 0.35)',
  },
  dangerTitle: { fontSize: 16, fontWeight: '800', color: colors.danger },
  dangerBody: { fontSize: 14, color: colors.textMuted, marginBottom: 16, lineHeight: 20, fontWeight: '500' },
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

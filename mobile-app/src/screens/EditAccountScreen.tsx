import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiGet, apiLogout, apiPost } from '../api/client';
import { AppSelectField } from '../components/AppSelectField';
import { AppTextField } from '../components/AppTextField';
import { GradientBackground } from '../components/GradientBackground';
import { PrimaryButton } from '../components/PrimaryButton';
import { SignupPickSheet } from '../components/SignupPickSheet';
import {
  SIGNUP_MEMBER_ROLES,
  SIGNUP_MIN_AGE,
  isUnbaptizedPublisher,
} from '../constants/signupMemberRoles';
import { useDashboardContext } from '../context/DashboardContext';
import type { HomeStackParamList, ProfileStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type Props =
  | NativeStackScreenProps<ProfileStackParamList, 'EditAccount'>
  | NativeStackScreenProps<HomeStackParamList, 'EditAccount'>;

type SignupCountry = { code: string; name: string };

function parseDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(Date.UTC(y, month - 1, day));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function isAtLeastAge(date: Date, minAge: number): boolean {
  const now = new Date();
  let age = now.getFullYear() - date.getUTCFullYear();
  const monthDiff = now.getMonth() - date.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getUTCDate())) {
    age -= 1;
  }
  return age >= minAge;
}

function formatIsoDateAsUserTypes(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
}

export function EditAccountScreen({ navigation }: Props) {
  const { user, refreshProfile, stackNavigation } = useDashboardContext();
  const [firstName, setFirstName] = useState(String(user?.first_name ?? ''));
  const [lastName, setLastName] = useState(String(user?.last_name ?? ''));
  const [username, setUsername] = useState(String(user?.username ?? ''));
  const [email, setEmail] = useState(String(user?.email ?? ''));
  const [phone, setPhone] = useState(String(user?.phone ?? ''));
  const [dateOfBirth, setDateOfBirth] = useState(
    String(user?.date_of_birth ?? '').slice(0, 10)
  );
  const [memberRole, setMemberRole] = useState(String(user?.member_type ?? ''));
  const [baptismDate, setBaptismDate] = useState(String(user?.baptism_date ?? '').slice(0, 10));
  const [signupCountry, setSignupCountry] = useState<SignupCountry | null>(null);
  const [countryOptions, setCountryOptions] = useState<string[]>([]);
  const [countryNameByLabel, setCountryNameByLabel] = useState<Record<string, SignupCountry>>({});
  const [roleSheetOpen, setRoleSheetOpen] = useState(false);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiGet('locations.php', false);
        if (cancelled) return;
        const cs = data.countries;
        if (!Array.isArray(cs)) return;
        const labels: string[] = [];
        const map: Record<string, SignupCountry> = {};
        for (const row of cs) {
          if (row == null || typeof row !== 'object') continue;
          const code = typeof row.code === 'string' ? row.code.trim().toUpperCase() : '';
          const name = typeof row.name === 'string' ? row.name.trim() : '';
          if (!code || !name) continue;
          const label = `${name} (${code})`;
          labels.push(label);
          map[label] = { code, name };
        }
        setCountryOptions(labels);
        setCountryNameByLabel(map);
        const code = String(user?.registration_country_code ?? '')
          .trim()
          .toUpperCase();
        if (code) {
          const match = Object.values(map).find((c) => c.code === code) ?? null;
          setSignupCountry(match);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.registration_country_code]);

  const unbaptized = useMemo(() => isUnbaptizedPublisher(memberRole), [memberRole]);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Profile', 'Enter your first and last name.');
      return;
    }
    if (!username.trim() || username.trim().length < 2) {
      Alert.alert('Profile', 'Username must be at least 2 characters.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Profile', 'Enter your email.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Profile', 'Enter your phone number.');
      return;
    }
    const dob = parseDate(dateOfBirth);
    if (!dob) {
      Alert.alert('Profile', 'Use YYYY-MM-DD for date of birth.');
      return;
    }
    if (!isAtLeastAge(dob, SIGNUP_MIN_AGE)) {
      Alert.alert('Profile', `You must be at least ${SIGNUP_MIN_AGE}.`);
      return;
    }
    if (!memberRole.trim()) {
      Alert.alert('Profile', 'Select your member type.');
      return;
    }
    if (!unbaptized) {
      if (!baptismDate.trim() || !parseDate(baptismDate)) {
        Alert.alert('Profile', 'Enter a valid baptism date (YYYY-MM-DD).');
        return;
      }
    } else if (baptismDate.trim() && !parseDate(baptismDate)) {
      Alert.alert('Profile', 'Use YYYY-MM-DD for baptism date.');
      return;
    }
    if (!signupCountry?.code) {
      Alert.alert('Profile', 'Select your country.');
      return;
    }

    Alert.alert(
      'Update profile?',
      'If you change your details, your account may need admin verification again and you will be signed out until approved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save changes',
          onPress: () => void doSave(),
        },
      ]
    );
  };

  const doSave = async () => {
    setSaving(true);
    try {
      const data = await apiPost(
        'profile-update.php',
        {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          date_of_birth: dateOfBirth.trim(),
          member_type: memberRole.trim(),
          baptism_date: baptismDate.trim(),
          registration_country_code: signupCountry!.code,
        },
        true
      );
      if (data.requires_reverification) {
        await apiLogout();
        Alert.alert(
          'Pending verification',
          'Your profile was updated. An admin must verify your account again before you can continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                stackNavigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Welcome' }],
                  })
                );
              },
            },
          ]
        );
        return;
      }
      await refreshProfile();
      Alert.alert('Profile updated', 'Your details were saved.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Could not update', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.pad} keyboardShouldPersistTaps="handled">
            <Text style={styles.lead}>
              Update your account details. Changing them will send your account back for admin
              verification.
            </Text>
            <AppTextField label="First name" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
            <AppTextField label="Last name" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
            <AppTextField
              label="Username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <AppTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
            />
            <AppTextField
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <AppTextField
              label="Date of birth"
              value={dateOfBirth}
              onChangeText={(t) => setDateOfBirth(formatIsoDateAsUserTypes(t))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
            />
            <AppSelectField
              label="Member type"
              value={memberRole}
              placeholder="Select role"
              onPress={() => setRoleSheetOpen(true)}
            />
            <AppTextField
              label="Baptism date"
              value={baptismDate}
              onChangeText={(t) => setBaptismDate(formatIsoDateAsUserTypes(t))}
              placeholder="YYYY-MM-DD"
              keyboardType="numbers-and-punctuation"
              hint={unbaptized ? 'Optional for unbaptized publishers' : undefined}
            />
            <AppSelectField
              label="Country"
              value={signupCountry ? signupCountry.name : ''}
              placeholder="Select country"
              onPress={() => setCountrySheetOpen(true)}
            />
            <View style={styles.actions}>
              <PrimaryButton title={saving ? 'Saving…' : 'Save changes'} onPress={() => void save()} disabled={saving} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <SignupPickSheet
          visible={roleSheetOpen}
          title="Member type"
          options={[...SIGNUP_MEMBER_ROLES]}
          selected={memberRole || null}
          onClose={() => setRoleSheetOpen(false)}
          onSelect={(v) => {
            setMemberRole(v);
            setRoleSheetOpen(false);
          }}
        />
        <SignupPickSheet
          visible={countrySheetOpen}
          title="Country"
          options={countryOptions}
          selected={signupCountry ? `${signupCountry.name} (${signupCountry.code})` : null}
          searchPlaceholder="Search countries"
          onClose={() => setCountrySheetOpen(false)}
          onSelect={(label) => {
            setSignupCountry(countryNameByLabel[label] ?? null);
            setCountrySheetOpen(false);
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pad: { padding: 20, paddingBottom: 40, gap: 4 },
  lead: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    marginBottom: 12,
  },
  actions: { marginTop: 16 },
});

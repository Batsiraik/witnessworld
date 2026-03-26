import { Ionicons } from '@expo/vector-icons';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiLogout } from '../api/client';
import { useDashboardContext } from '../context/DashboardContext';
import { MainTabNavigator } from './MainTabNavigator';
import type { HomeStackParamList, MainDrawerParamList, RootStackParamList } from './types';
import { colors } from '../theme/colors';

const Drawer = createDrawerNavigator<MainDrawerParamList>();

type DrawerExploreKey = Exclude<
  keyof HomeStackParamList,
  | 'Home'
  | 'Profile'
  | 'ProviderHub'
  | 'CreateListing'
  | 'CreateStore'
  | 'CreateDirectoryEntry'
  | 'DirectoryDetail'
  | 'ListingDetail'
  | 'StoreDetailPublic'
  | 'ProductDetail'
>;

const MENU: { route: DrawerExploreKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { route: 'Classifieds', label: 'Classified marketplace', icon: 'grid-outline' },
  { route: 'Services', label: 'Service marketplace', icon: 'briefcase-outline' },
  { route: 'ProductsBrowse', label: 'Shop products', icon: 'pricetag-outline' },
  { route: 'Stores', label: 'Online stores', icon: 'storefront-outline' },
  { route: 'Directory', label: 'Business directory', icon: 'business-outline' },
];

function CustomDrawerContent(
  props: DrawerContentComponentProps & {
    parentNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
  }
) {
  const insets = useSafeAreaInsets();
  const { user } = useDashboardContext();
  const name =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() || 'Member';
  const avatarUri = user?.avatar_url && String(user.avatar_url).trim() !== '' ? String(user.avatar_url) : null;

  const signOut = async () => {
    await apiLogout();
    props.parentNavigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Welcome' }] }));
  };

  const goExplore = (screen: DrawerExploreKey) => {
    props.navigation.navigate('Main', {
      screen: 'HomeTab',
      params: { screen },
    });
  };

  const goProfile = () => {
    props.navigation.navigate('Main', {
      screen: 'HomeTab',
      params: { screen: 'Profile' },
    });
  };

  const goOffice = () => {
    props.navigation.navigate('Main', {
      screen: 'OfficeTab',
      params: { screen: 'MyOffice' },
    });
  };

  const goInbox = () => {
    props.navigation.navigate('Main', {
      screen: 'InboxTab',
      params: { screen: 'Inbox' },
    });
  };

  return (
    <View style={styles.drawerRoot}>
      <DrawerContentScrollView {...props} contentContainerStyle={[styles.drawerScroll, { paddingBottom: 12 }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImg} accessibilityLabel="Profile photo" />
            ) : (
              <Ionicons name="person" size={28} color={colors.primaryDark} />
            )}
          </View>
          <Text style={styles.drawerName}>{name}</Text>
          {user?.email ? <Text style={styles.drawerEmail}>{user.email}</Text> : null}
        </View>
        <DrawerItem
          label="Home"
          icon={({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />}
          onPress={() =>
            props.navigation.navigate('Main', {
              screen: 'HomeTab',
              params: { screen: 'Home' },
            })
          }
          activeTintColor={colors.primary}
          inactiveTintColor={colors.textMuted}
          labelStyle={styles.drawerLabel}
        />
        <DrawerItem
          label="Inbox"
          icon={({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} />}
          onPress={goInbox}
          activeTintColor={colors.primary}
          inactiveTintColor={colors.textMuted}
          labelStyle={styles.drawerLabel}
        />
        <DrawerItem
          label="My office"
          icon={({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />}
          onPress={goOffice}
          activeTintColor={colors.primary}
          inactiveTintColor={colors.textMuted}
          labelStyle={styles.drawerLabel}
        />
        {MENU.map((item) => (
          <DrawerItem
            key={item.route}
            label={item.label}
            icon={({ color, size }) => <Ionicons name={item.icon} size={size} color={color} />}
            onPress={() => goExplore(item.route)}
            activeTintColor={colors.primary}
            inactiveTintColor={colors.textMuted}
            labelStyle={styles.drawerLabel}
          />
        ))}
      </DrawerContentScrollView>
      <View style={[styles.drawerFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <Pressable
          onPress={goProfile}
          style={({ pressed }) => [styles.profileBtn, pressed && styles.profileBtnPressed]}
        >
          <Ionicons name="settings-outline" size={22} color={colors.primaryDark} />
          <Text style={styles.profileBtnText}>Profile & settings</Text>
        </Pressable>
        <Pressable
          onPress={() => void signOut()}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </View>
    </View>
  );
}

type Props = {
  parentNavigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

export function MainDrawerNavigator({ parentNavigation }: Props) {
  return (
    <Drawer.Navigator
      drawerContent={(p) => <CustomDrawerContent {...p} parentNavigation={parentNavigation} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: colors.bgTop, width: 300 },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textMuted,
      }}
    >
      <Drawer.Screen name="Main" component={MainTabNavigator} />
    </Drawer.Navigator>
  );
}

const styles = StyleSheet.create({
  drawerRoot: { flex: 1, backgroundColor: colors.bgTop },
  drawerScroll: { flexGrow: 1 },
  drawerHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(11, 18, 32, 0.08)',
    marginBottom: 8,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImg: { width: 52, height: 52, borderRadius: 16 },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(31, 170, 242, 0.1)',
    marginBottom: 10,
  },
  profileBtnPressed: { opacity: 0.88 },
  profileBtnText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
  drawerName: { fontSize: 18, fontWeight: '800', color: colors.text },
  drawerEmail: { fontSize: 13, color: colors.textMuted, marginTop: 4, fontWeight: '500' },
  drawerLabel: { fontWeight: '600', fontSize: 15 },
  drawerFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(11, 18, 32, 0.08)',
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: colors.bgTop,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
  },
  logoutBtnPressed: { opacity: 0.85 },
  logoutText: { fontSize: 16, fontWeight: '700', color: colors.danger },
});

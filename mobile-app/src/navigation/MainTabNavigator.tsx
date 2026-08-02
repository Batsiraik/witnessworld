import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  CommonActions,
  useNavigation,
  type NavigationProp,
  type NavigationState,
} from '@react-navigation/native';
import type { ViewStyle } from 'react-native';
import { Platform, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { HOME_STACK_DETAIL_ROUTES } from './homeStackSafeBack';
import { HomeStackNavigator } from './HomeStackNavigator';
import { InboxStackNavigator } from './InboxStackNavigator';
import { OfficeStackNavigator } from './OfficeStackNavigator';
import { DiscoverStackNavigator } from './DiscoverStackNavigator';
import { PostStackNavigator } from './PostStackNavigator';
import { ProfileStackNavigator } from './ProfileStackNavigator';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/** Matches reference: active tab tint */
const TAB_ACTIVE = '#5A5FE1';
const TAB_INACTIVE = '#64748B';

/** Hidden routes still get a BottomTabItem wrapper; collapse flex so visible tabs stay equal. */
const HIDDEN_TAB_ITEM: ViewStyle = {
  flexGrow: 0,
  flexShrink: 0,
  flexBasis: 0,
  width: 0,
  minWidth: 0,
  maxWidth: 0,
  opacity: 0,
  overflow: 'hidden',
};

/** Center tab opens Orders (purchases & hire requests) — replaces the old Post FAB. */
function OrdersTabButton(props: BottomTabBarButtonProps) {
  const navigation = useNavigation<NavigationProp<MainTabParamList>>();
  const { onLongPress, accessibilityState, children } = props;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Orders and requests"
      accessibilityState={accessibilityState}
      onPress={() => {
        navigation.navigate('HomeTab', { screen: 'Orders' });
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.ordersTabBtn, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
}

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);
  const tabBarHeight = 56 + bottomPad;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE,
        tabBarInactiveTintColor: TAB_INACTIVE,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: 'rgba(11, 18, 32, 0.08)',
          borderTopWidth: StyleSheet.hairlineWidth,
          paddingTop: 6,
          paddingBottom: bottomPad,
          height: tabBarHeight,
          elevation: 12,
          shadowColor: '#0B1220',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: Platform.OS === 'ios' ? 0 : 4 },
        tabBarItemStyle: { paddingTop: 4 },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackNavigator}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            let nav: typeof navigation | undefined = navigation;
            for (let i = 0; i < 8 && nav; i++) {
              const s = nav.getState() as NavigationState;
              if (
                s.type === 'stack' &&
                Array.isArray(s.routeNames) &&
                s.routeNames.includes('Home') &&
                s.routeNames.includes('ListingDetail')
              ) {
                const idx = s.index;
                const name = String(s.routes[idx]?.name ?? '');
                if (idx === 0 && name === 'Home') return;
                if (idx > 0 || HOME_STACK_DETAIL_ROUTES.has(name)) {
                  e.preventDefault();
                  nav.dispatch(CommonActions.navigate({ name: 'Home' }));
                }
                return;
              }
              nav = nav.getParent();
            }
          },
        })}
      />
      <Tab.Screen
        name="DiscoverTab"
        component={DiscoverStackNavigator}
        options={{
          title: 'Discover',
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="PostTab"
        component={PostStackNavigator}
        options={{
          title: 'Orders',
          tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
          tabBarButton: (props) => <OrdersTabButton {...props} />,
        }}
      />
      <Tab.Screen
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStackNavigator}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OfficeTab"
        component={OfficeStackNavigator}
        options={{
          title: 'My office',
          tabBarButton: () => null,
          tabBarItemStyle: HIDDEN_TAB_ITEM,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  ordersTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.88 },
});

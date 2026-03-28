import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CommonActions, type NavigationState } from '@react-navigation/native';
import { HOME_STACK_DETAIL_ROUTES } from './homeStackSafeBack';
import { HomeStackNavigator } from './HomeStackNavigator';
import { InboxStackNavigator } from './InboxStackNavigator';
import { OfficeStackNavigator } from './OfficeStackNavigator';
import { colors } from '../theme/colors';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          borderTopColor: 'rgba(11, 18, 32, 0.08)',
          backgroundColor: colors.white,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
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
        name="InboxTab"
        component={InboxStackNavigator}
        options={{
          title: 'Inbox',
          tabBarIcon: ({ color, size }) => <Ionicons name="mail-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="OfficeTab"
        component={OfficeStackNavigator}
        options={{
          title: 'My office',
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

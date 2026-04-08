import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

function MenuIcon({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Open menu">
      <Ionicons name="menu-outline" size={26} color={colors.text} />
    </Pressable>
  );
}

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.text },
        headerLeft: () => (
          <MenuIcon onPress={() => navigation.dispatch(DrawerActions.openDrawer())} />
        ),
      })}
    >
      <Stack.Screen name="Profile" component={ProfileSettingsScreen} options={{ title: 'Profile & settings' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

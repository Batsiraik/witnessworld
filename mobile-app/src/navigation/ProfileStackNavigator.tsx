import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { colors } from '../theme/colors';
import type { ProfileStackParamList } from './types';

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export function ProfileStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.text },
        headerLeft: () => null,
      }}
    >
      <Stack.Screen name="Profile" component={ProfileSettingsScreen} options={{ title: 'Profile & settings' }} />
    </Stack.Navigator>
  );
}

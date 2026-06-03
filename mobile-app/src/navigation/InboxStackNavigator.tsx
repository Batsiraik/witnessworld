import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { InboxChatBackButton } from '../components/InboxChatBackButton';
import { ChatScreen } from '../screens/ChatScreen';
import { InboxListScreen } from '../screens/InboxListScreen';
import { MemberPublicProfileScreen } from '../screens/MemberPublicProfileScreen';
import { colors } from '../theme/colors';
import type { InboxStackParamList } from './types';

const Stack = createNativeStackNavigator<InboxStackParamList>();

export function InboxStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.text },
      }}
    >
      <Stack.Screen name="Inbox" component={InboxListScreen} options={{ title: 'Inbox' }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route, navigation }) => ({
          title: route.params.peerName || 'Chat',
          headerBackVisible: false,
          headerLeft: () => <InboxChatBackButton navigation={navigation} />,
          gestureEnabled: true,
        })}
      />
      <Stack.Screen
        name="MemberPublicProfile"
        component={MemberPublicProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Stack.Navigator>
  );
}

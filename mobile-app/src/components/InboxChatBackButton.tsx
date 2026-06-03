import { Ionicons } from '@expo/vector-icons';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Platform, Pressable } from 'react-native';
import type { InboxStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

type InboxNav = NativeStackNavigationProp<InboxStackParamList>;

/** Leave chat — back to previous screen or inbox list. */
export function exitInboxChat(navigation: InboxNav) {
  if (navigation.canGoBack()) {
    navigation.goBack();
    return;
  }
  navigation.navigate('Inbox');
}

type Props = {
  navigation: InboxNav;
};

export function InboxChatBackButton({ navigation }: Props) {
  return (
    <Pressable
      onPress={() => exitInboxChat(navigation)}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Back to inbox"
      style={{ paddingHorizontal: 4, paddingVertical: 6, marginLeft: Platform.OS === 'android' ? 4 : 0 }}
    >
      <Ionicons name="chevron-back" size={28} color={colors.text} />
    </Pressable>
  );
}

import type { MainTabParamList } from './types';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

/** Call from a screen inside HomeTab stack — opens the Inbox chat tab. */
export function openInboxChat(
  navigation: { getParent: () => BottomTabNavigationProp<MainTabParamList> | undefined },
  conversationId: number,
  peerName?: string,
  peerUserId?: number,
  peerUsername?: string
): void {
  const tab = navigation.getParent();
  tab?.navigate('InboxTab', {
    screen: 'Chat',
    params: { conversationId, peerName, peerUserId, peerUsername },
  });
}

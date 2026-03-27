import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function navigateToSupportChat(conversationId: number): void {
  let attempts = 0;
  const go = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('SupportChat', { conversationId });
      return;
    }
    if (attempts++ < 40) {
      setTimeout(go, 100);
    }
  };
  go();
}

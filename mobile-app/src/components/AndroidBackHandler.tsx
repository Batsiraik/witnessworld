import type { NavigationState, PartialState } from '@react-navigation/native';
import { StackActions } from '@react-navigation/native';
import { useEffect } from 'react';
import { Alert, BackHandler, Platform } from 'react-native';
import { findHomeStackPopTargetKey } from '../navigation/homeStackSafeBack';
import { navigationRef } from '../navigation/navigationRef';

/**
 * Whether any navigator in the tree can pop (nested stacks, tabs with stack history, etc.).
 * Root `navigationRef.canGoBack()` alone is often wrong for drawer + tabs + stacks.
 */
function navTreeCanGoBack(state: NavigationState | PartialState<NavigationState> | undefined): boolean {
  if (!state || typeof state.index !== 'number' || !state.routes?.length) {
    return false;
  }
  if (state.index > 0) {
    return true;
  }
  const route = state.routes[state.index];
  if (route && typeof route === 'object' && 'state' in route && route.state != null) {
    return navTreeCanGoBack(route.state as NavigationState | PartialState<NavigationState>);
  }
  return false;
}

/**
 * Handles Android hardware back: pop inner screens first, then confirm before exiting the app.
 */
export function AndroidBackHandler(): null {
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }

    const onHardwareBackPress = (): boolean => {
      if (!navigationRef.isReady()) {
        return false;
      }

      const root = navigationRef.getRootState() as NavigationState | PartialState<NavigationState>;
      const popKey = findHomeStackPopTargetKey(root as NavigationState);
      if (popKey) {
        navigationRef.dispatch({ ...StackActions.pop(1), target: popKey });
        return true;
      }

      if (navTreeCanGoBack(root)) {
        navigationRef.goBack();
        return true;
      }

      Alert.alert(
        'Close app?',
        'Are you sure you want to close the app?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: () => {
              BackHandler.exitApp();
            },
          },
        ]
      );
      return true;
    };

    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBackPress);
    return () => sub.remove();
  }, []);

  return null;
}

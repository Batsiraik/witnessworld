import { StackActions, type StackNavigationState } from '@react-navigation/native';
import type { HomeStackParamList } from './types';

/** Narrow surface so each screen’s navigation prop is accepted without route-level union conflicts. */
export type HomeStackBackNavigation = {
  getState(): StackNavigationState<HomeStackParamList>;
  dispatch(action: ReturnType<typeof StackActions.pop>): void;
  navigate(name: 'Home'): void;
};

/**
 * Header / programmatic back for the home marketplace stack.
 * Uses an explicit stack pop (not `goBack()`) so we never bubble to the tab/drawer/root
 * when the inner stack is already at index 0 — which can finish the Android activity.
 */
export function homeStackSafeGoBack(navigation: HomeStackBackNavigation): void {
  const state = navigation.getState();
  if (state.index > 0) {
    navigation.dispatch(StackActions.pop());
    return;
  }
  navigation.navigate('Home');
}

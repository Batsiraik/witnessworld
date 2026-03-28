import { StackActions, type NavigationState } from '@react-navigation/native';
import type { HomeStackParamList } from './types';

/** Detail routes on the main Home tab stack (not root index screens like Classifieds). */
export const HOME_STACK_DETAIL_ROUTES = new Set<string>([
  'Cart',
  'ListingDetail',
  'MemberPublicProfile',
  'ProductDetail',
  'StoreDetailPublic',
  'DirectoryDetail',
]);

/** The marketplace Home stack always registers these routes together. */
function isWitnessHomeStackState(state: NavigationState): boolean {
  return (
    state.type === 'stack' &&
    Array.isArray(state.routeNames) &&
    state.routeNames.includes('Home') &&
    state.routeNames.includes('ListingDetail')
  );
}

export type HomeStackBackNavigation = {
  getState(): NavigationState;
  dispatch(action: object): void;
  navigate(name: keyof HomeStackParamList): void;
  getParent(): HomeStackBackNavigation | undefined;
};

/**
 * Header back on the Home tab stack. Walks up to the real stack navigator so we
 * do not read Tab/Drawer state by mistake, and pops when the focused route is a
 * detail screen even if `index` is wrongly reported as 0 (RN Screens quirk).
 */
export function homeStackSafeGoBack(navigation: HomeStackBackNavigation): void {
  let nav: HomeStackBackNavigation | undefined = navigation;

  for (let i = 0; i < 12 && nav; i++) {
    const state = nav.getState();
    if (!isWitnessHomeStackState(state)) {
      nav = nav.getParent();
      continue;
    }

    const idx = state.index;
    const route = state.routes[idx];
    const name = route ? String(route.name) : '';

    if (idx > 0 || HOME_STACK_DETAIL_ROUTES.has(name)) {
      nav.dispatch(StackActions.pop(1));
      return;
    }

    if (name !== 'Home') {
      nav.navigate('Home');
      return;
    }

    nav = nav.getParent();
  }

  navigation.navigate('Home');
}

/**
 * For Android hardware back: find the Home tab stack in the root tree and return
 * its navigator key when it should pop (same rules as header back).
 */
export function findHomeStackPopTargetKey(state: NavigationState | undefined): string | null {
  if (!state) return null;
  const active = state.routes[state.index];
  if (active.state) {
    const deeper = findHomeStackPopTargetKey(active.state as NavigationState);
    if (deeper) return deeper;
  }
  if (!isWitnessHomeStackState(state)) return null;
  const idx = state.index;
  const r = state.routes[idx];
  const name = r ? String(r.name) : '';
  if (idx > 0 || HOME_STACK_DETAIL_ROUTES.has(name)) {
    return state.key;
  }
  return null;
}

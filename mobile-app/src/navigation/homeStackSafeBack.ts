import { CommonActions, StackActions, type NavigationState } from '@react-navigation/native';
import type { HomeStackParamList } from './types';

/** Detail routes on the main Home tab stack (not root index screens like Classifieds). */
export const HOME_STACK_DETAIL_ROUTES = new Set<string>([
  'Cart',
  'CartCheckout',
  'Orders',
  'OrderDetail',
  'Favorites',
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
 * do not read Tab state by mistake, and pops when the focused route is a
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
    const depth = state.routes.length;
    const isDetail = HOME_STACK_DETAIL_ROUTES.has(name);

    /**
     * Never pop the last screen of the stack: on release Android builds with
     * react-native-screens this can native-crash. Pop once only if history exists
     * or the stack reports more than one route (RN Screens index quirk).
     */
    if (idx > 0 || (isDetail && depth > 1)) {
      nav.dispatch(StackActions.pop(1));
      return;
    }

    if (isDetail && depth <= 1) {
      nav.navigate('Home');
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
  const depth = state.routes.length;
  const isDetail = HOME_STACK_DETAIL_ROUTES.has(name);
  if (idx > 0 || (isDetail && depth > 1)) {
    return state.key;
  }
  return null;
}

/** When the home stack is a single detail route, hardware back should jump to Home, not pop. */
export function findHomeStackNavigateHomeTargetKey(state: NavigationState | undefined): string | null {
  if (!state) return null;
  const active = state.routes[state.index];
  if (active?.state) {
    const deeper = findHomeStackNavigateHomeTargetKey(active.state as NavigationState);
    if (deeper) return deeper;
  }
  if (!isWitnessHomeStackState(state)) return null;
  const idx = state.index;
  const r = state.routes[idx];
  const name = r ? String(r.name) : '';
  if (HOME_STACK_DETAIL_ROUTES.has(name) && state.routes.length <= 1) {
    return state.key;
  }
  return null;
}

export function buildNavigateHomeOnStackAction(stackKey: string) {
  return { ...CommonActions.navigate({ name: 'Home' }), target: stackKey };
}

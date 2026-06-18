import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';

/** From any tab stack screen — open listing edit in My office. */
export function openOfficeEditListing(
  navigation: { getParent: () => BottomTabNavigationProp<MainTabParamList> | undefined },
  listingId: number
): void {
  navigation.getParent()?.navigate('OfficeTab', {
    screen: 'EditListing',
    params: { listingId },
  });
}

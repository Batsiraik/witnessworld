import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';
import { homeStackSafeGoBack, type HomeStackBackNavigation } from './homeStackSafeBack';
import { BrowseClassifiedsScreen, BrowseCommunityScreen, BrowseServicesScreen } from '../screens/BrowseListingsScreen';
import { BrowseProductsScreen } from '../screens/BrowseProductsScreen';
import { BrowseStoresScreen } from '../screens/BrowseStoresScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ListingDetailScreen } from '../screens/ListingDetailScreen';
import { MemberPublicProfileScreen } from '../screens/MemberPublicProfileScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { CreateDirectoryEntryScreen } from '../screens/CreateDirectoryEntryScreen';
import { CreateStoreScreen } from '../screens/CreateStoreScreen';
import { StoreDetailPublicScreen } from '../screens/StoreDetailPublicScreen';
import { DirectoryDetailScreen } from '../screens/DirectoryDetailScreen';
import { DirectoryScreen } from '../screens/DirectoryScreen';
import { ProviderHubScreen } from '../screens/ProviderHubScreen';
import { CartScreen } from '../screens/CartScreen';
import { colors } from '../theme/colors';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

function BackIcon({ navigation }: { navigation: HomeStackBackNavigation }) {
  return (
    <Pressable
      onPress={() => homeStackSafeGoBack(navigation)}
      style={styles.iconBtn}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Ionicons name="arrow-back" size={24} color={colors.text} />
    </Pressable>
  );
}

export function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={({ navigation, route }) => ({
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.text },
        headerLeft: route.name === 'Home' ? () => null : () => <BackIcon navigation={navigation} />,
      })}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Classifieds"
        component={BrowseClassifiedsScreen}
        options={{ title: 'Classified marketplace' }}
      />
      <Stack.Screen name="Services" component={BrowseServicesScreen} options={{ title: 'Service marketplace' }} />
      <Stack.Screen name="Community" component={BrowseCommunityScreen} options={{ title: 'Community classifieds' }} />
      <Stack.Screen name="Stores" component={BrowseStoresScreen} options={{ title: 'Online stores' }} />
      <Stack.Screen name="ProductsBrowse" component={BrowseProductsScreen} options={{ title: 'Shop products' }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Business directory' }} />
      <Stack.Screen name="DirectoryDetail" component={DirectoryDetailScreen} options={{ title: 'Business' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="MemberPublicProfile"
        component={MemberPublicProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen name="StoreDetailPublic" component={StoreDetailPublicScreen} options={{ title: 'Store' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: 'Cart' }} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} options={{ title: 'Favorites' }} />
      <Stack.Screen name="Profile" component={ProfileSettingsScreen} options={{ title: 'Profile & settings' }} />
      <Stack.Screen
        name="ProviderHub"
        component={ProviderHubScreen}
        options={({ navigation }) => ({
          title: 'Create listing',
          headerLeft: () => <BackIcon navigation={navigation} />,
        })}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        initialParams={{ listingType: 'classified' }}
        options={{ title: 'New listing' }}
      />
      <Stack.Screen name="CreateStore" component={CreateStoreScreen} options={{ title: 'Open a store' }} />
      <Stack.Screen
        name="CreateDirectoryEntry"
        component={CreateDirectoryEntryScreen}
        options={{ title: 'Directory listing' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    marginLeft: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import { Ionicons } from '@expo/vector-icons';
import { DrawerActions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Pressable, StyleSheet } from 'react-native';
import { homeStackSafeGoBack, type HomeStackBackNavigation } from './homeStackSafeBack';
import { BrowseListingsScreen } from '../screens/BrowseListingsScreen';
import { BrowseProductsScreen } from '../screens/BrowseProductsScreen';
import { BrowseStoresScreen } from '../screens/BrowseStoresScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ListingDetailScreen } from '../screens/ListingDetailScreen';
import { ProductDetailScreen } from '../screens/ProductDetailScreen';
import { ProfileSettingsScreen } from '../screens/ProfileSettingsScreen';
import { CreateDirectoryEntryScreen } from '../screens/CreateDirectoryEntryScreen';
import { CreateStoreScreen } from '../screens/CreateStoreScreen';
import { StoreDetailPublicScreen } from '../screens/StoreDetailPublicScreen';
import { DirectoryDetailScreen } from '../screens/DirectoryDetailScreen';
import { DirectoryScreen } from '../screens/DirectoryScreen';
import { ProviderHubScreen } from '../screens/ProviderHubScreen';
import { colors } from '../theme/colors';
import type { HomeStackParamList } from './types';

const Stack = createNativeStackNavigator<HomeStackParamList>();

function MenuIcon({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Open menu">
      <Ionicons name="menu-outline" size={26} color={colors.text} />
    </Pressable>
  );
}

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
        headerLeft:
          route.name === 'Home'
            ? () => (
                <MenuIcon
                  onPress={() => {
                    navigation.dispatch(DrawerActions.openDrawer());
                  }}
                />
              )
            : () => <BackIcon navigation={navigation} />,
      })}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Witness World' }} />
      <Stack.Screen
        name="Classifieds"
        component={BrowseListingsScreen}
        options={{ title: 'Classified marketplace' }}
      />
      <Stack.Screen name="Services" component={BrowseListingsScreen} options={{ title: 'Service marketplace' }} />
      <Stack.Screen name="Stores" component={BrowseStoresScreen} options={{ title: 'Online stores' }} />
      <Stack.Screen name="ProductsBrowse" component={BrowseProductsScreen} options={{ title: 'Shop products' }} />
      <Stack.Screen name="Directory" component={DirectoryScreen} options={{ title: 'Business directory' }} />
      <Stack.Screen name="DirectoryDetail" component={DirectoryDetailScreen} options={{ title: 'Business' }} />
      <Stack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: 'Listing' }} />
      <Stack.Screen name="StoreDetailPublic" component={StoreDetailPublicScreen} options={{ title: 'Store' }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Product' }} />
      <Stack.Screen name="Profile" component={ProfileSettingsScreen} options={{ title: 'Profile & settings' }} />
      <Stack.Screen
        name="ProviderHub"
        component={ProviderHubScreen}
        options={({ navigation }) => ({
          title: 'Become a service provider',
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

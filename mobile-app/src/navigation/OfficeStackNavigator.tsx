import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CreateDirectoryEntryScreen } from '../screens/CreateDirectoryEntryScreen';
import { CreateListingScreen } from '../screens/CreateListingScreen';
import { EditProductScreen } from '../screens/EditProductScreen';
import { EditStoreScreen } from '../screens/EditStoreScreen';
import { MyOfficeScreen } from '../screens/MyOfficeScreen';
import { StoreManageScreen } from '../screens/StoreManageScreen';
import { colors } from '../theme/colors';
import type { OfficeStackParamList } from './types';

const Stack = createNativeStackNavigator<OfficeStackParamList>();

export function OfficeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.white },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 17, color: colors.text },
      }}
    >
      <Stack.Screen name="MyOffice" component={MyOfficeScreen} options={{ title: 'My office' }} />
      <Stack.Screen name="EditListing" component={CreateListingScreen} options={{ title: 'Edit listing' }} />
      <Stack.Screen name="StoreManage" component={StoreManageScreen} options={{ title: 'Manage store' }} />
      <Stack.Screen name="EditStore" component={EditStoreScreen} options={{ title: 'Edit storefront' }} />
      <Stack.Screen
        name="EditProduct"
        component={EditProductScreen}
        options={({ route }) => ({ title: route.params?.productId ? 'Edit product' : 'Add product' })}
      />
      <Stack.Screen
        name="EditDirectoryEntry"
        component={CreateDirectoryEntryScreen}
        options={{ title: 'Edit directory listing' }}
      />
    </Stack.Navigator>
  );
}

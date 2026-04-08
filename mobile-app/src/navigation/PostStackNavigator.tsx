import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';
import type { PostTabStackParamList } from './types';

const Stack = createNativeStackNavigator<PostTabStackParamList>();

/** Placeholder — the tab uses a custom FAB button; this screen is not shown. */
function PostEmptyScreen() {
  return <View style={styles.fill} />;
}

export function PostStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PostEmpty" component={PostEmptyScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bgTop },
});

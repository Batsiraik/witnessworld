import 'react-native-gesture-handler';
// Must match Expo SDK (see bundledNativeModules); wrong worklets version causes installTurboModule crashes with Reanimated 4.
import 'react-native-worklets';
import 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { registerRootComponent } from 'expo';

import App from './App';

// Required pairing: hold native splash until we call hideAsync in App (Expo Go can hang on "100%" without this).
void SplashScreen.preventAutoHideAsync().catch(() => {});

registerRootComponent(App);

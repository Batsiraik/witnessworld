import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { useCallback, useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AndroidBackHandler } from './src/components/AndroidBackHandler';
import { AppErrorBoundary } from './src/components/AppErrorBoundary';
import { navigationRef } from './src/navigation/navigationRef';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/colors';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bgTop,
    primary: colors.primary,
  },
};

export default function App() {
  const hideSplash = useCallback(() => {
    void SplashScreen.hideAsync().catch(() => {
      /* already hidden in some dev modes */
    });
  }, []);

  useEffect(() => {
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      hideSplash();
      raf2 = requestAnimationFrame(hideSplash);
    });
    const t = setTimeout(hideSplash, 500);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
    };
  }, [hideSplash]);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={hideSplash}>
      <SafeAreaProvider>
        <AppErrorBoundary>
          <NavigationContainer ref={navigationRef} theme={navTheme} onReady={hideSplash}>
            <StatusBar style="dark" />
            <RootNavigator />
            <AndroidBackHandler />
          </NavigationContainer>
        </AppErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

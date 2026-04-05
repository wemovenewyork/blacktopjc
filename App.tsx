import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  RobotoCondensed_400Regular,
  RobotoCondensed_700Bold,
} from '@expo-google-fonts/roboto-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from '@/navigation';

SplashScreen.preventAutoHideAsync();

// Inject web-only CSS to map native font names → Google Fonts
// This runs once on mount and is a no-op on native.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    /* Map Expo native fonts to Google Fonts equivalents on web */
    @font-face {
      font-family: 'BebasNeue_400Regular';
      font-weight: 400;
      src: local('Barlow Condensed Bold'), local('BarlowCondensed-Bold');
    }
    @font-face {
      font-family: 'RobotoCondensed_700Bold';
      font-weight: 700;
      src: local('Barlow Condensed Bold'), local('BarlowCondensed-Bold');
    }
    @font-face {
      font-family: 'RobotoCondensed_400Regular';
      font-weight: 400;
      src: local('Barlow Condensed'), local('BarlowCondensed');
    }
    /* When Barlow Condensed is available via Google Fonts link,
       React Native Web's font-family references will pick it up
       because we're adding it as a fallback in the base CSS.     */
    * {
      font-family: 'BebasNeue_400Regular', 'Barlow Condensed',
                   'RobotoCondensed_400Regular', sans-serif;
    }
  `;
  document.head.appendChild(style);
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

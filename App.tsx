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

export default function App() {
  const [fontsLoaded] = useFonts({
    BebasNeue_400Regular,
    RobotoCondensed_400Regular,
    RobotoCondensed_700Bold,
  });

  // Inject Google Fonts + global web styles after mount
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      // Google Fonts
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800&family=DM+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);

      // Global CSS overrides
      const style = document.createElement('style');
      style.textContent = `
        ::-webkit-scrollbar { display: none; }
        * { scrollbar-width: none; -ms-overflow-style: none; }
        html, body { background-color: #0D0D0D; }
        input::placeholder { color: #888888; }
        input:focus, textarea:focus { outline: none; }
      `;
      document.head.appendChild(style);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
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

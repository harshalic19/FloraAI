import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import AppSplashScreen from './src/screens/AppSplashScreen';
import { Colors } from './src/constants/theme';
import { requestNotificationPermission, rescheduleAllReminders } from './src/utils/notifications';
import { getPlants } from './src/storage/plantStorage';

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  useEffect(() => {
    (async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        const plants = await getPlants();
        await rescheduleAllReminders(plants);
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.background} />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>

        {/* Splash overlays the app — fades out and unmounts when done */}
        {splashVisible && (
          <AppSplashScreen onDone={() => setSplashVisible(false)} />
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({});

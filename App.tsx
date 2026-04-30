import 'react-native-gesture-handler';
import React, { useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import AppSplashScreen from './src/screens/AppSplashScreen';
import { Colors } from './src/constants/theme';

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  const handleSplashDone = () => {
    setSplashVisible(false);
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>

      {/* Splash overlays the app — fades out and unmounts when done */}
      {splashVisible && (
        <AppSplashScreen onDone={handleSplashDone} />
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({});

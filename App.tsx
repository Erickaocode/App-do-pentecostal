import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BibleProvider } from './src/context/BibleContext';
import { UserDbProvider } from './src/db/UserDbProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { colors } from './src/theme';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Preparando a Bíblia...</Text>
    </View>
  );
}

function ThemedApp() {
  const { scheme, colors: themeColors } = useTheme();
  const navigationTheme = useMemo(
    () => ({
      ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
      colors: {
        ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
        background: themeColors.background,
        card: themeColors.surface,
        text: themeColors.textPrimary,
        border: themeColors.border,
        primary: themeColors.primary,
      },
    }),
    [scheme, themeColors]
  );

  return (
    <>
      <NavigationContainer theme={navigationTheme}>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      {/* A versão da Bíblia escolhida fica salva nos dados da pessoa, então o banco dela vem primeiro. */}
      <UserDbProvider fallback={<LoadingScreen />}>
        <BibleProvider fallback={<LoadingScreen />}>
          <ThemeProvider>
            <ThemedApp />
          </ThemeProvider>
        </BibleProvider>
      </UserDbProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
});

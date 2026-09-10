import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import React, { Suspense } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserDbProvider } from './src/db/UserDbProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme';

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>Preparando a Bíblia...</Text>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Suspense fallback={<LoadingScreen />}>
        <SQLiteProvider
          databaseName="blivre.db"
          assetSource={{ assetId: require('./assets/bible/blivre.db') }}
          useSuspense
        >
          <UserDbProvider fallback={<LoadingScreen />}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </UserDbProvider>
        </SQLiteProvider>
      </Suspense>
      <StatusBar style="dark" />
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

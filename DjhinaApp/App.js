import 'react-native-gesture-handler';
import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppProvider } from './src/context/AppContext';
import AppNavigator from './src/navigation/AppNavigator';

class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.container}>
          <Text style={eb.title}>⚠️ Erreur Djhina</Text>
          <Text style={eb.message}>{this.state.error.toString()}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F0A1E', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#F59E0B', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  message: { color: '#A78BFA', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});

export default function App() {
  const rootStyle = Platform.OS === 'web'
    ? { flex: 1, height: '100vh', overflow: 'hidden' }
    : { flex: 1 };

  return (
    <GestureHandlerRootView style={rootStyle}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <AppProvider>
            <StatusBar style="light" backgroundColor="transparent" translucent />
            <AppNavigator />
          </AppProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

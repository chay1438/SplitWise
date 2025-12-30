import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// import { Provider } from 'react-redux';
// import { store } from './src/store';
import RootNavigation from './src/navigation/RootNavigation';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
   // <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigation />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    //</Provider>
  );
}

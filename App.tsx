import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store, persistor } from './src/store';
import { PersistGate } from 'redux-persist/integration/react';
import RootNavigation from './src/navigation/RootNavigation';
import { StatusBar } from 'react-native';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <RootNavigation />
          </GestureHandlerRootView>
          <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}

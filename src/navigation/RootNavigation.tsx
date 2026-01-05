import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'
import { useAuth } from '../hooks/useAuth'
import { ActivityIndicator, View } from 'react-native'

import * as Linking from 'expo-linking';

const linking = {
  prefixes: [Linking.createURL('/'), 'splitwise://'],
  config: {
    screens: {
      Login: 'login',
      UpdatePassword: 'reset-password',
    },
  },
};

export default function RootNavigation() {
  const { session, loading } = useAuth()
  console.log('ROOT NAV SESSION:', !!session);
  console.log('ROOT NAV LOADING:', loading);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0B' }}>
        <ActivityIndicator size="large" color="#FF8C32" />
      </View>
    )
  }

  return (
    <NavigationContainer linking={linking}>
      {session ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  )
}

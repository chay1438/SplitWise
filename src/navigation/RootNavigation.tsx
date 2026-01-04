import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'
import { useAuth } from '../hooks/useAuth'
import { ActivityIndicator, View } from 'react-native'

export default function RootNavigation() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0B' }}>
        <ActivityIndicator size="large" color="#FF8C32" />
      </View>
    )
  }

  return (
    <NavigationContainer>
      {user ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  )
}

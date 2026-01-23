import React, { useEffect } from 'react'
import { useRealtimeSubscriptions } from '../hooks/useRealtimeSubscriptions'
import { NavigationContainer } from '@react-navigation/native'
import AuthStack from './AuthStack'
import AppStack from './AppStack'
import { useAuth } from '../hooks/useAuth'
import { ActivityIndicator, View, Alert } from 'react-native'
import * as Linking from 'expo-linking';
import { useJoinGroupMutation } from '../store/api/invitationsApi' // RTK Query

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

  // 🔥 Enable Realtime Global Listeners
  useRealtimeSubscriptions();

  console.log('ROOT NAV SESSION:', !!session);
  console.log('ROOT NAV LOADING:', loading);

  // RTK Query Mutation for joining
  const [joinGroup] = useJoinGroupMutation();

  // Handle Deep Links (especially for Group Invites)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      const parsed = Linking.parse(url);

      if (parsed.path === 'join-group') {
        const token = parsed.queryParams?.token as string;

        if (!token) {
          Alert.alert('Error', 'Invalid invitation link (missing token).');
          return;
        }

        if (!session) {
          // If user is not logged in, we can't join yet. 
          // Ideally, store the token and auto-join after login.
          // For now, just alert.
          Alert.alert('Login Required', 'Please log in to join the group.');
          return;
        }

        Alert.alert(
          'Joining Group...',
          'Please wait while we join the group.',
          [],
          { cancelable: false }
        );

        try {
          // Call RTK Query Mutation
          const result = await joinGroup({ token }).unwrap();

          if (result.success) {
            Alert.alert('Success!', result.message);
            // Ideally navigate to the group details here
          } else {
            Alert.alert('Failed to Join', result.message);
          }
        } catch (error: any) {
          console.error('Join Error:', error);
          Alert.alert('Failed to Join', error.message || 'Unknown error');
        }
      }
    };

    // 1. Listen for incoming links while app is open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 2. Check if app was opened FROM a link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [session, joinGroup]); // Re-run if session changes

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

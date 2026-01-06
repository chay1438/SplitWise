import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUser, selectSession, selectIsLoading, setSession, setUser, setLoading } from '../store/slices/authSlice';
import { useInitializeAuthQuery } from '../store/api/authApi';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import * as Contacts from 'expo-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const session = useAppSelector(selectSession);
  const isLoadingStore = useAppSelector(selectIsLoading);
  const [forceEntry, setForceEntry] = React.useState(false);

  // Initial auth check
  const {
    data: initData,
    isLoading: isInitLoading,
    refetch
  } = useInitializeAuthQuery();

  // Request contacts permission after first login
  const requestContactsPermission = async () => {
    try {
      // Check if we've already asked
      const hasAsked = await AsyncStorage.getItem('contacts_permission_asked');
      if (hasAsked) return;

      // Ask for permission
      Alert.alert(
        'Find Friends',
        'Allow SplitWise to access your contacts to find friends who are already using the app?',
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: async () => {
              await AsyncStorage.setItem('contacts_permission_asked', 'true');
            }
          },
          {
            text: 'Allow',
            onPress: async () => {
              const { status } = await Contacts.requestPermissionsAsync();
              await AsyncStorage.setItem('contacts_permission_asked', 'true');

              if (status === 'granted') {
                Alert.alert('Success', 'You can now find friends from your contacts!');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error requesting contacts permission:', error);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {

      if (event === 'SIGNED_OUT' || session === null) {
        // Clear all auth state on sign out
        dispatch(setSession(null));
        dispatch(setUser(null));
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        dispatch(setSession(session));

        // Fetch user profile
        if (session?.user) {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (data) dispatch(setUser(data));

          // Request contacts permission (only on first login)
          if (event === 'SIGNED_IN') {
            setTimeout(() => requestContactsPermission(), 1000); // Delay 1 second
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]); // Only depend on dispatch, not user

  // Safety timeout to prevent infinite loading screen
  useEffect(() => {
    if (isLoadingStore || isInitLoading) {
      const timer = setTimeout(() => {
        if (isLoadingStore || isInitLoading) {
          console.warn('Auth loading timed out - forcing app entry');
          dispatch(setLoading(false));
          setForceEntry(true);
        }
      }, 5000); // 5 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [isLoadingStore, isInitLoading, dispatch]);

  return {
    session,
    user,
    profile: user,
    loading: (isLoadingStore || isInitLoading) && !forceEntry,
    isAuthenticated: !!session,
    refreshSession: refetch
  };
}

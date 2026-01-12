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
  // Initial auth check
  useEffect(() => {
    const initializeAuth = async () => {
      // Don't set loading true again if we already have session, to avoid flicker
      // But we need to ensure we run this once.
      // Actually, assume loading IS true from store initial state.
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (initialSession) {
          dispatch(setSession(initialSession));
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', initialSession.user.id)
            .single();
          if (profile) dispatch(setUser(profile));
        }
      } catch (e) {
        console.warn("Init failed", e);
      } finally {
        dispatch(setLoading(false));
      }
    };

    initializeAuth();
  }, [dispatch]);

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

      if (event === 'SIGNED_OUT') {
        // Clear all auth state on sign out
        dispatch(setSession(null));
        dispatch(setUser(null));
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Only update if differnt to avoid spurious re-renders
        // But for now, we just let it be, but we avoid overriding the loading state
        dispatch(setSession(session));

        // Fetch user profile if not already in store (optimization)
        if (session?.user) {
          // We do this fetch only if we suspect we don't have the user, or just rely on the init check.
          // However, for safety in token refresh, we can keep it.
          // To avoid flickering, DO NOT set loading(true) here.
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
  }, [dispatch]);

  // Safety timeout to prevent infinite loading screen
  useEffect(() => {
    if (isLoadingStore) {
      const timer = setTimeout(() => {
        if (isLoadingStore) {
          console.warn('Auth loading timed out - forcing app entry');
          dispatch(setLoading(false));
          setForceEntry(true);
        }
      }, 5000); // 5 seconds timeout
      return () => clearTimeout(timer);
    }
  }, [isLoadingStore, dispatch]);

  return {
    session,
    user,
    profile: user,
    loading: isLoadingStore && !forceEntry,
    isAuthenticated: !!session,
    refreshSession: () => { } // No-op or implement simpler refresh if needed
  };
}

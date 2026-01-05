import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUser, selectSession, selectIsLoading, setSession, setUser } from '../store/slices/authSlice';
import { useInitializeAuthQuery } from '../store/api/authApi';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export function useAuth() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const session = useAppSelector(selectSession);
  const isLoadingStore = useAppSelector(selectIsLoading);

  // Initial auth check
  const {
    data: initData,
    isLoading: isInitLoading,
    refetch
  } = useInitializeAuthQuery();

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
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]); // Only depend on dispatch, not user

  return {
    session,
    user,
    profile: user, // Alias user as profile for compatibility
    loading: isLoadingStore || isInitLoading,
    isAuthenticated: !!session,
    refreshSession: refetch
  };
}

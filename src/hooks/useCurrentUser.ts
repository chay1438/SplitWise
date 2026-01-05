import { useAuth } from './useAuth';

/**
 * A safe hook to get the current user's essential details.
 * It prioritizes the Redux 'user' (Profile) but falls back to the Auth 'session' if the profile is loading or missing.
 * This guarantees an ID is available if the session exists.
 */
export const useCurrentUser = () => {
    const { user, session } = useAuth();

    // Derived State
    const id = user?.id || session?.user?.id;
    const email = user?.email || session?.user?.email;
    const full_name = user?.full_name || session?.user?.user_metadata?.name || email?.split('@')[0] || 'User';
    const avatar_url = user?.avatar_url;

    return {
        id,
        email,
        full_name,
        avatar_url,
        // Helper specifically for logic checks
        isAuthenticated: !!id,
        // The raw objects if needed
        profile: user,
        session
    };
};

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';

export const configureGoogleSignIn = () => {
    GoogleSignin.configure({
        scopes: ['email', 'profile'],
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, // Using Expo's env var convention if applicable, or fallback to standard env
        offlineAccess: true,
    });
};

export const signInWithGoogle = async () => {
    try {
        await GoogleSignin.hasPlayServices();
        const userInfo = await GoogleSignin.signIn();

        if (userInfo.data?.idToken) {
            const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: userInfo.data.idToken,
            });
            if (error) throw error;
            return data;
        } else {
            throw new Error('No ID token present!');
        }
    } catch (error: any) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
            // user cancelled the login flow
            console.log('User cancelled login');
            return null;
        } else if (error.code === statusCodes.IN_PROGRESS) {
            // operation (e.g. sign in) is in progress already
            console.log('Login in progress');
            return null;
        } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
            // play services not available or outdated
            throw new Error('Play services not available');
        } else {
            // some other error happened
            throw error;
        }
    }
};

export const signOutGoogle = async () => {
    try {
        await GoogleSignin.signOut();
    } catch (error) {
        console.error(error);
    }
};

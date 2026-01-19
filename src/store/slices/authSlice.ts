import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '@supabase/supabase-js';
import { Profile } from '../../types';
import { RootState } from '../store';

interface AuthState {
    user: Profile | null;
    session: Session | null;
    isLoading: boolean;
    initialized: boolean;
}

const initialState: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    initialized: false,
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<Session | null>) => {
            state.session = action.payload;
        },
        setUser: (state, action: PayloadAction<Profile | null>) => {
            state.user = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        }
    },
});

export const { setSession, setUser, setLoading } = authSlice.actions;

export const selectUser = (state: RootState) => state.auth.user;
export const selectSession = (state: RootState) => state.auth.session;
export const selectAuthInitialized = (state: RootState) => state.auth.initialized;
export const selectIsLoading = (state: RootState) => state.auth.isLoading;

export default authSlice.reducer;

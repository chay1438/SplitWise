import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';
import { Session } from '@supabase/supabase-js';
import { setSession, setUser, setLoading } from '../slices/authSlice';

import { authService } from '../../services/authService';

export const authApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        initializeAuth: builder.query<{ session: Session | null, user: Profile | null }, void>({
            queryFn: async () => {
                try {
                    const session = await authService.getSession();

                    let userProfile: Profile | null = null;
                    if (session?.user) {
                        const { data } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        userProfile = data;
                    }
                    return { data: { session, user: userProfile } };
                } catch (e: any) {
                    return { error: e.message };
                }
            },
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                dispatch(setLoading(true));
                try {
                    const { data } = await queryFulfilled;
                    dispatch(setSession(data.session));
                    dispatch(setUser(data.user));
                } catch (err) {
                    console.error("Auth init failed", err);
                } finally {
                    dispatch(setLoading(false));
                }
            },
        }),
        signOut: builder.mutation<null, void>({
            queryFn: async () => {
                try {
                    await authService.signOut();
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(setSession(null));
                    dispatch(setUser(null));
                    dispatch(apiSlice.util.resetApiState());
                } catch (e) { }
            }
        }),
        signIn: builder.mutation<null, { email: string; password: string }>({
            queryFn: async ({ email, password }) => {
                try {
                    await authService.signIn(email, password);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        }),
        signUp: builder.mutation<null, { email: string; password: string; name: string }>({
            queryFn: async ({ email, password, name }) => {
                try {
                    await authService.signUp(email, password, name);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        }),
        resetPassword: builder.mutation<null, string>({
            queryFn: async (email) => {
                try {
                    await authService.resetPasswordForEmail(email);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        }),
        updatePassword: builder.mutation<null, string>({
            queryFn: async (password) => {
                try {
                    await authService.updatePassword(password);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        })
    }),
});

export const { useInitializeAuthQuery, useSignOutMutation, useSignInMutation, useSignUpMutation, useResetPasswordMutation, useUpdatePasswordMutation } = authApiSlice;

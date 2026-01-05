import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Profile } from '../../types';

import { friendService } from '../../services/friendService';

export const friendsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        getFriends: builder.query<Profile[], string>({
            queryFn: async (userId) => {
                try {
                    const data = await friendService.getFriends(userId);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Friends']
        }),

        sendFriendRequest: builder.mutation<void, { fromUserId: string, toUserId: string }>({
            queryFn: async ({ fromUserId, toUserId }) => {
                try {
                    await friendService.sendFriendRequest(fromUserId, toUserId);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Friends']
        }),

        acceptFriendRequest: builder.mutation<void, { requestId: string, userId: string }>({
            queryFn: async ({ requestId, userId }) => {
                try {
                    await friendService.acceptFriendRequest(requestId, userId);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Friends']
        }),

        rejectFriendRequest: builder.mutation<void, { requestId: string, userId: string }>({
            queryFn: async ({ requestId, userId }) => {
                try {
                    await friendService.rejectFriendRequest(requestId, userId);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Friends']
        }),

        getPendingRequests: builder.query<any[], string>({
            queryFn: async (userId) => {
                try {
                    const data = await friendService.getPendingRequests(userId);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Friends']
        }),

        searchUsers: builder.mutation<Profile[], string>({
            queryFn: async (query) => {
                try {
                    const data = await friendService.searchUsers(query);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        }),

        searchUserByEmail: builder.mutation<Profile | null, string>({
            queryFn: async (email) => {
                try {
                    const data = await friendService.searchUserByEmail(email);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            }
        })

    }),
});

export const {
    useGetFriendsQuery,
    useSendFriendRequestMutation,
    useAcceptFriendRequestMutation,
    useRejectFriendRequestMutation,
    useGetPendingRequestsQuery,
    useSearchUsersMutation,
    useSearchUserByEmailMutation
} = friendsApiSlice;

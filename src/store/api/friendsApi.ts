import { apiSlice } from './apiSlice';
import { friendService } from '../../services/friendService';
import { Profile } from '../../lib/types';

export const friendsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        searchUsers: builder.query<Profile[], string>({
            queryFn: async (query) => {
                try {
                    const data = await friendService.searchUsers(query);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),
        getFriends: builder.query<Profile[], void>({
            queryFn: async () => {
                try {
                    const data = await friendService.getFriends();
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Friends' as const, id })),
                        { type: 'Friends', id: 'LIST' },
                    ]
                    : [{ type: 'Friends', id: 'LIST' }],
        }),
    }),
});

export const { useSearchUsersQuery, useGetFriendsQuery } = friendsApi;

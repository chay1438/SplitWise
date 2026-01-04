import { apiSlice } from './apiSlice';
import { groupService } from '../../services/groupService';
import { Group } from '../../lib/types';

export const groupsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        fetchMyGroups: builder.query<Group[], void>({
            queryFn: async () => {
                try {
                    const data = await groupService.fetchMyGroups();
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: (result) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Groups' as const, id })),
                        { type: 'Groups', id: 'LIST' },
                    ]
                    : [{ type: 'Groups', id: 'LIST' }],
        }),
        createGroup: builder.mutation<Group, string>({
            queryFn: async (name) => {
                try {
                    const data = await groupService.createGroup(name);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: [{ type: 'Groups', id: 'LIST' }],
        }),
    }),
});

export const { useFetchMyGroupsQuery, useCreateGroupMutation } = groupsApi;

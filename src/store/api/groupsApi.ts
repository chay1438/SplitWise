import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Group, GroupWithMembers } from '../../types';

import { groupService } from '../../services/groupService';

export const groupsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        getGroups: builder.query<GroupWithMembers[], string>({
            queryFn: async (userId) => {
                try {
                    const data = await groupService.getGroups(userId);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Groups']
        }),

        createGroup: builder.mutation<Group, { name: string; type: string; createdBy: string; memberIds?: string[] }>({
            queryFn: async (input) => {
                try {
                    const data = await groupService.createGroup(input);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        }),

        addMember: builder.mutation<void, { groupId: string; userId: string }>({
            queryFn: async ({ groupId, userId }) => {
                try {
                    await groupService.addMember(groupId, userId);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),

        updateGroup: builder.mutation<void, { groupId: string; name?: string; type?: string }>({
            queryFn: async ({ groupId, ...updates }) => {
                try {
                    await groupService.updateGroup(groupId, updates);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        })

    }),
});

export const { useGetGroupsQuery, useCreateGroupMutation, useAddMemberMutation, useUpdateGroupMutation } = groupsApiSlice;

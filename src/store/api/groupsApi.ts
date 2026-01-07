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

        createGroup: builder.mutation<Group, { name: string; type: string; createdBy: string; memberIds?: string[]; avatar_url?: string }>({
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

        addMember: builder.mutation<null, { groupId: string; userId: string }>({
            queryFn: async ({ groupId, userId }) => {
                try {
                    await groupService.addMember(groupId, userId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),

        updateGroup: builder.mutation<null, { groupId: string; name?: string; type?: string; avatar_url?: string | null }>({
            queryFn: async ({ groupId, ...updates }) => {
                try {
                    // @ts-ignore - updates might contain nulls which service might not strict-check, but we want to pass them
                    await groupService.updateGroup(groupId, updates);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        }),

        leaveGroup: builder.mutation<null, { groupId: string; userId: string }>({
            queryFn: async ({ groupId, userId }) => {
                try {
                    await groupService.leaveGroup(groupId, userId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        }),

        deleteGroup: builder.mutation<null, string>({
            queryFn: async (groupId) => {
                try {
                    await groupService.deleteGroup(groupId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        }),

        updateMemberRole: builder.mutation<null, { groupId: string; userId: string; role: 'admin' | 'member' }>({
            queryFn: async ({ groupId, userId, role }) => {
                try {
                    await groupService.updateMemberRole(groupId, userId, role);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        }),

        removeMember: builder.mutation<null, { groupId: string; userId: string }>({
            queryFn: async ({ groupId, userId }) => {
                try {
                    await groupService.removeMember(groupId, userId);
                    return { data: null };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Groups']
        })

    }),
});

export const { useGetGroupsQuery, useCreateGroupMutation, useAddMemberMutation, useUpdateGroupMutation, useLeaveGroupMutation, useDeleteGroupMutation, useUpdateMemberRoleMutation, useRemoveMemberMutation } = groupsApiSlice;

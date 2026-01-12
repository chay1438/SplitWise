import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';
import uuid from 'react-native-uuid';

const invitationsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        // 1. Create Invitation Token
        createInvitation: builder.mutation<string, { groupId: string }>({
            queryFn: async ({ groupId }) => {
                try {
                    // Use react-native-uuid
                    const token = uuid.v4() as string;

                    const { data: userData } = await supabase.auth.getUser();
                    if (!userData.user) throw new Error("Not authenticated");

                    const { error } = await supabase
                        .from('group_invitations')
                        .insert({
                            group_id: groupId,
                            token: token,
                            created_by: userData.user.id
                        });

                    if (error) throw error;

                    return { data: token };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
        }),

        // 2. Join Group via Token
        joinGroup: builder.mutation<{ success: boolean; message: string; groupId?: string }, { token: string }>({
            queryFn: async ({ token }) => {
                try {
                    const { data, error } = await supabase.rpc('join_group_via_token', {
                        invite_token: token
                    });

                    if (error) throw error;

                    if (!data.success) {
                        return { error: data.message };
                    }

                    return { data: { success: data.success, message: data.message, groupId: data.group_id } };
                } catch (error: any) {
                    return { error: error.message || 'Failed to join group' };
                }
            },
            // Validate: Invalidate Groups list so the new group appears immediately
            invalidatesTags: ['Groups', 'Activities']
        })
    }),
});

export const { useCreateInvitationMutation, useJoinGroupMutation } = invitationsApi;

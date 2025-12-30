import { supabase } from '../lib/supabase';
import { Group, GroupMember } from '../lib/types';

export const groupService = {
    /**
     * Fetch groups that the current user belongs to.
     */
    async fetchMyGroups() {
        // 1. Get group_ids from group_members
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error('User not authenticated');

        const { data: memberData, error: memberError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', authData.user.id);

        if (memberError) throw memberError;

        if (!memberData || memberData.length === 0) return [];

        const groupIds = memberData.map((m: any) => m.group_id);

        // 2. Fetch groups
        const { data: groups, error: groupsError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds)
            .order('created_at', { ascending: false });

        if (groupsError) throw groupsError;

        return groups as Group[];
    },

    /**
     * Create a new group and add the creator as a member.
     */
    async createGroup(name: string) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error('User not authenticated');

        const userId = authData.user.id;

        // 1. Create group
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .insert({
                name,
                created_by: userId,
            })
            .select()
            .single();

        if (groupError) throw groupError;

        // 2. Add creator as member (admin)
        const { error: memberError } = await supabase
            .from('group_members')
            .insert({
                group_id: groupData.id,
                user_id: userId,
                role: 'admin',
            });

        if (memberError) {
            // Cleanup if member creation fails? For now just throw.
            console.error('Failed to add creator as member:', memberError);
            throw memberError;
        }

        return groupData as Group;
    }
};

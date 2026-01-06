import { supabase } from '../lib/supabase';
import { Group, GroupWithMembers } from '../types';

export const groupService = {
    async getGroups(userId: string): Promise<GroupWithMembers[]> {
        const { data: memberships, error: memberError } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', userId);

        if (memberError) throw memberError;
        if (!memberships?.length) return [];

        const groupIds = memberships.map(m => m.group_id);

        const { data, error } = await supabase
            .from('groups')
            .select(`
                *,
                members:group_members(
                    role,
                    profile:profiles!user_id(*)
                )
            `)
            .in('id', groupIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((g: any) => ({
            ...g,
            members: g.members.map((m: any) => m.profile).filter(Boolean)
        })) as GroupWithMembers[];
    },

    async createGroup(data: { name: string; type: string; createdBy: string; memberIds?: string[]; avatar_url?: string }): Promise<Group> {
        const { data: group, error } = await supabase
            .from('groups')
            .insert({
                name: data.name,
                type: data.type,
                created_by: data.createdBy,
                avatar_url: data.avatar_url
            })
            .select()
            .single();

        if (error) throw error;

        const allMembers = new Set([...(data.memberIds || []), data.createdBy]);
        const memberInserts = Array.from(allMembers).map(userId => ({
            group_id: group.id,
            user_id: userId,
            role: userId === data.createdBy ? 'admin' : 'member'
        }));

        const { error: memberError } = await supabase.from('group_members').insert(memberInserts);
        if (memberError) throw memberError;

        return group;
    },

    async addMember(groupId: string, userId: string) {
        const { error } = await supabase
            .from('group_members')
            .insert({ group_id: groupId, user_id: userId, role: 'member' });
        if (error) throw error;
    },

    async updateGroup(groupId: string, data: { name?: string; type?: string; avatar_url?: string }): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .update(data)
            .eq('id', groupId);
        if (error) throw error;
    }
};

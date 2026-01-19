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
                group_members ( 
                    user_id,
                    profile:profiles (*)
                )
            `)
            .in('id', groupIds)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Transform to GroupWithMembers
        return data.map((group: any) => ({
            ...group,
            members: group.group_members
                .map((gm: any) => gm.profile)
                .filter((p: any) => p !== null), // Filter out null profiles if any
            member_count: group.group_members.length
        })) as GroupWithMembers[];
    },

    async getGroupMembers(groupId: string): Promise<any[]> {
        const { data, error } = await supabase
            .from('group_members')
            .select(`
                role,
                profile:profiles!user_id(*)
            `)
            .eq('group_id', groupId);

        if (error) throw error;

        return data
            .filter((m: any) => m.profile)
            .map((m: any) => ({
                ...m.profile,
                role: m.role || 'member'
            }));
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
    },

    async leaveGroup(groupId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async deleteGroup(groupId: string): Promise<void> {
        const { error } = await supabase
            .from('groups')
            .delete()
            .eq('id', groupId);

        if (error) throw error;
    },

    async updateMemberRole(groupId: string, userId: string, role: 'admin' | 'member'): Promise<void> {
        const { error } = await supabase
            .from('group_members')
            .update({ role })
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
    },

    async removeMember(groupId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('group_members')
            .delete()
            .eq('group_id', groupId)
            .eq('user_id', userId);

        if (error) throw error;
    }
};

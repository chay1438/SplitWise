import { supabase } from '../lib/supabase';
import { Profile } from '../types';

export const friendService = {
    async getFriends(userId: string): Promise<Profile[]> {
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                user_id1,
                user_id2,
                status
            `)
            .or(`user_id1.eq.${userId},user_id2.eq.${userId}`)
            .eq('status', 'accepted');

        if (error) throw error;

        const friendIds = data.map(f => f.user_id1 === userId ? f.user_id2 : f.user_id1);

        if (friendIds.length === 0) return [];

        const { data: profiles, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', friendIds);

        if (pError) throw pError;
        return profiles as Profile[];
    },

    async sendFriendRequest(fromUserId: string, toUserId: string) {
        // Send a friend request (status: pending)
        const { error } = await supabase
            .from('friendships')
            .insert({
                user_id1: fromUserId,  // Sender
                user_id2: toUserId,    // Recipient
                status: 'pending'      // ✅ Pending, not accepted!
            });
        if (error) throw error;
    },

    async acceptFriendRequest(requestId: string, userId: string) {
        // Accept a friend request (only recipient can accept)
        const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId)
            .eq('user_id2', userId);  // Must be the recipient
        if (error) throw error;
    },

    async rejectFriendRequest(requestId: string, userId: string) {
        // Reject/remove a friend request
        const { error } = await supabase
            .from('friendships')
            .delete()
            .eq('id', requestId)
            .eq('user_id2', userId);  // Must be the recipient
        if (error) throw error;
    },

    async getPendingRequests(userId: string): Promise<any[]> {
        // Get friend requests sent TO you (that you need to accept/reject)
        const { data, error } = await supabase
            .from('friendships')
            .select(`
                id,
                user_id1,
                created_at,
                sender:profiles!user_id1(*)
            `)
            .eq('user_id2', userId)
            .eq('status', 'pending');

        if (error) throw error;
        return data || [];
    },

    async searchUsers(query: string): Promise<Profile[]> {
        if (query.length < 3) return [];
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)  // Search by name OR email
            .limit(10);
        if (error) throw error;
        return data || [];
    },

    async searchUserByEmail(email: string): Promise<Profile | null> {
        // Search for a specific user by exact email
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data as Profile;
    }
};

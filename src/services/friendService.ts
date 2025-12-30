import { supabase } from '../lib/supabase';
import { Profile } from '../lib/types';

export const friendService = {
  /**
   * Search for users by email or name.
   */
  async searchUsers(query: string) {
    if (!query) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return data as Profile[];
  },

  /**
   * Get a list of "friends". 
   * For now, this might just be users you have a balance with or valid group members.
   * But usually this involves a friends table. I'll return a mock empty or all profiles for now if no specific logic exists.
   * Actually, let's just return profiles in your groups.
   */
  async getFriends() {
    // Determine friends as people you are in groups with.
    // 1. Get my groups
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Not authenticated');

    const { data: myGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', authData.user.id);
    
    if (!myGroups || myGroups.length === 0) return [];

    const groupIds = myGroups.map(g => g.group_id);

    // 2. Get user IDs in these groups
    const { data: memberData } = await supabase
        .from('group_members')
        .select('user_id')
        .in('group_id', groupIds)
        .neq('user_id', authData.user.id); // Exclude self

    if (!memberData || memberData.length === 0) return [];

    const friendIds = [...new Set(memberData.map(m => m.user_id))];

    // 3. Get profiles
    const { data: friends, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

    if (error) throw error;
    return friends as Profile[];
  }
};

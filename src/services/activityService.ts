import { supabase } from '../lib/supabase';
import { Activity } from '../types';

export const activityService = {
    async getActivities(userId: string): Promise<Activity[]> {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data as Activity[];
    }
};

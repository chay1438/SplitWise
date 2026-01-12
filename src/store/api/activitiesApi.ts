import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';

import { Activity } from '../../types';

import { activityService } from '../../services/activityService';

export const activitiesApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getActivities: builder.query<Activity[], { userId: string; limit?: number }>({
            queryFn: async ({ userId, limit = 20 }) => {
                try {
                    const data = await activityService.getActivities(userId);
                    return { data };
                } catch (e: any) {
                    return { error: e.message };
                }
            },
            providesTags: ['Activities']
        }),
    }),
});

export const { useGetActivitiesQuery } = activitiesApiSlice;

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { apiSlice } from '../store/api/apiSlice';

export function useRealtimeSubscriptions() {
    const dispatch = useAppDispatch();
    const user = useAppSelector(selectUser);

    useEffect(() => {
        if (!user) return;

        console.log('🔌 Initializing Realtime Subscriptions for user:', user.id);

        const channel = supabase.channel('global_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT, UPDATE, DELETE
                    schema: 'public',
                },
                (payload) => {
                    console.log('🔔 Realtime Event:', payload.eventType, payload.table);

                    // --- STRATEGY: Global Tag Invalidation ---
                    // Instead of complex logic to patch cache, we simply tell RTK Query
                    // "The data for this tag is stale, please re-fetch."

                    switch (payload.table) {
                        case 'expenses':
                        case 'expense_splits':
                        case 'settlements':
                            // Re-fetch anything related to Expenses or Balances
                            dispatch(apiSlice.util.invalidateTags(['Expenses', 'Balances']));
                            break;

                        case 'groups':
                        case 'group_members':
                            // Re-fetch Groups list
                            dispatch(apiSlice.util.invalidateTags(['Groups']));
                            break;

                        case 'activities':
                        case 'notifications':
                            // We don't have RTK Tags for these yet, but usually we would.
                            // If you add Activity API later, add 'Activities' tag here.
                            dispatch(apiSlice.util.invalidateTags(['Activities', 'Notifications']));
                            break;
                    }
                }
            )
            .subscribe((status) => {
                console.log('🔌 Realtime Status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, dispatch]);
}

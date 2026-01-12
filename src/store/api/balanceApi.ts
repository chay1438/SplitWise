import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { BalanceSummary } from '../../types';

import { balanceService } from '../../services/balanceService';

export const balanceApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        getUserBalanceSummary: builder.query<BalanceSummary, string>({
            queryFn: async (userId) => {
                try {
                    const data = await balanceService.getUserBalanceSummary(userId);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Balances']
        }),

        getBalances: builder.query<any[], string>({
            queryFn: async (userId) => {
                try {
                    const data = await balanceService.getBalances(userId);
                    return { data };
                } catch (e: any) {
                    return { error: e.message };
                }
            },
            providesTags: ['Balances']
        }),

        getGroupActionableBalances: builder.query<any[], { groupId: string; currentUserId: string }>({
            queryFn: async ({ groupId, currentUserId }) => {
                try {
                    const data = await balanceService.getGroupActionableBalances(groupId, currentUserId);
                    return { data };
                } catch (e: any) {
                    return { error: e.message };
                }
            },
            providesTags: ['Balances', 'Expenses']
        })

    }),
});

export const { useGetUserBalanceSummaryQuery, useGetBalancesQuery, useGetGroupActionableBalancesQuery } = balanceApiSlice;

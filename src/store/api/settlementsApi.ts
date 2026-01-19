import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Settlement } from '../../types';

import { settlementService } from '../../services/settlementService';

export const settlementsApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        getSettlements: builder.query<Settlement[], { userId?: string; groupId?: string }>({
            queryFn: async (filters) => {
                try {
                    const data = await settlementService.getSettlements(filters.userId, filters.groupId);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Balances'] // Settlements affect balances!
        }),

        createSettlement: builder.mutation<Settlement, {
            payerId: string;
            payeeId: string;
            amount: number;
            groupId?: string;
            date: string;
        }>({
            queryFn: async (input) => {
                try {
                    const data = await settlementService.createSettlement(input);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Balances', 'Expenses']
        })

    }),
});

export const { useGetSettlementsQuery, useCreateSettlementMutation } = settlementsApiSlice;

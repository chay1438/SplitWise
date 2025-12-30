import { apiSlice } from './apiSlice';
import { expenseService } from '../../services/expenseService';
import { Expense } from '../../lib/types';

export const expensesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        fetchGroupExpenses: builder.query<Expense[], string>({
            queryFn: async (groupId) => {
                try {
                    const data = await expenseService.fetchGroupExpenses(groupId);
                    return { data: data as Expense[] };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: (result, error, groupId) =>
                result
                    ? [
                        ...result.map(({ id }) => ({ type: 'Expenses' as const, id })),
                        { type: 'Expenses', id: `LIST_${groupId}` },
                    ]
                    : [{ type: 'Expenses', id: `LIST_${groupId}` }],
        }),
        createExpense: builder.mutation<
            Expense,
            {
                groupId: string;
                amount: number;
                description: string;
                splitType: 'EQUAL' | 'SELECTIVE' | 'INDIVIDUAL';
                splits: { user_id: string; share_amount: number }[];
            }
        >({
            queryFn: async ({ groupId, amount, description, splitType, splits }) => {
                try {
                    const data = await expenseService.createExpense(groupId, amount, description, splitType, splits);
                    return { data: data as Expense };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: (result, error, { groupId }) => [
                { type: 'Expenses', id: `LIST_${groupId}` },
                // Also invalidate balances if we had a balance API
            ],
        }),
    }),
});

export const { useFetchGroupExpensesQuery, useCreateExpenseMutation } = expensesApi;

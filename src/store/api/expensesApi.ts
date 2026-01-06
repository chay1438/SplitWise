import { apiSlice } from './apiSlice';
import { supabase } from '../../lib/supabase';
import { Expense, ExpenseWithDetails } from '../../types';

import { expenseService } from '../../services/expenseService';

export const expensesApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        getExpenses: builder.query<ExpenseWithDetails[], { groupId?: string; userId?: string; page?: number; limit?: number }>({
            queryFn: async (filters) => {
                try {
                    const data = await expenseService.getExpenses(filters);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            providesTags: ['Expenses']
        }),

        createExpense: builder.mutation<Expense, {
            groupId?: string;
            description: string;
            amount: number;
            date: string;
            paidBy: string;
            splits: { userId: string; amount: number }[];
            userId: string;
            receiptUrl?: string;
            friendId?: string;
        }>({
            queryFn: async (input) => {
                try {
                    const data = await expenseService.createExpense(input);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Expenses', 'Balances', 'Groups']
        }),

        deleteExpense: builder.mutation<void, string>({
            queryFn: async (expenseId) => {
                try {
                    await expenseService.deleteExpense(expenseId);
                    return { data: undefined };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Expenses', 'Balances']
        }),

        updateExpense: builder.mutation<any, { id: string; updates: any }>({
            queryFn: async ({ id, updates }) => {
                try {
                    const data = await expenseService.updateExpense(id, updates);
                    return { data };
                } catch (error: any) {
                    return { error: error.message };
                }
            },
            invalidatesTags: ['Expenses', 'Balances', 'Groups']
        }),

    }),
});

export const { useGetExpensesQuery, useCreateExpenseMutation, useDeleteExpenseMutation, useUpdateExpenseMutation } = expensesApiSlice;

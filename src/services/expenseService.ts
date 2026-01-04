import { supabase } from '../lib/supabase';
import { Expense, ExpenseSplit } from '../lib/types';

export const expenseService = {
    /**
     * Fetch expenses for a specific group.
     * Includes the splits for each expense.
     */
    async fetchGroupExpenses(groupId: string) {
        const { data, error } = await supabase
            .from('expenses')
            .select(`
        *,
        expense_split (*)
      `)
            .eq('group_id', groupId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // transform/validate if needed
        return data;
    },

    /**
     * Create a new expense and its splits.
     */
    async createExpense(
        groupId: string,
        amount: number,
        description: string,
        splitType: 'EQUAL' | 'SELECTIVE' | 'INDIVIDUAL',
        splits: { user_id: string; share_amount: number }[]
    ) {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData.user) throw new Error('User not authenticated');

        // 1. Create expense
        const { data: expenseData, error: expenseError } = await supabase
            .from('expenses')
            .insert({
                group_id: groupId,
                amount,
                description,
                split_type: splitType,
                created_by: authData.user.id
            })
            .select()
            .single();

        if (expenseError) throw expenseError;

        // 2. Create splits AND balances updates could go here or in trigger
        // For now dealing with splits
        const splitsToInsert = splits.map(s => ({
            expense_id: expenseData.id,
            user_id: s.user_id,
            share_amount: s.share_amount
        }));

        const { error: splitError } = await supabase
            .from('expense_split')
            .insert(splitsToInsert);

        if (splitError) throw splitError;

        return expenseData;
    }
};

import { supabase } from '../lib/supabase';
import { Expense, ExpenseWithDetails } from '../types';

export const expenseService = {
    async getExpenses(filters: { groupId?: string; userId?: string }): Promise<ExpenseWithDetails[]> {
        let query = supabase
            .from('expenses')
            .select(`
            *,
            payer:profiles!payer_id(*),
            splits:expense_splits(
              *,
              user:profiles!user_id(*)
            )
          `)
            .order('date', { ascending: false });

        if (filters.groupId) query = query.eq('group_id', filters.groupId);

        const { data, error } = await query;
        if (error) throw error;

        let result = data as ExpenseWithDetails[];

        if (filters.userId && !filters.groupId) {
            result = result.filter(e =>
                e.payer_id === filters.userId ||
                e.splits.some(s => s.user_id === filters.userId)
            );
        }

        return result;
    },

    async createExpense(data: {
        groupId?: string;
        description: string;
        amount: number;
        date: string;
        paidBy: string;
        splits: { userId: string; amount: number }[];
        userId: string;
        receiptUrl?: string;
        friendId?: string;
    }): Promise<Expense> {
        const { data: expense, error: expError } = await supabase
            .from('expenses')
            .insert({
                group_id: data.groupId,
                description: data.description,
                amount: data.amount,
                date: data.date,
                payer_id: data.paidBy,
                created_by: data.userId,
                receipt_url: data.receiptUrl
            })
            .select()
            .single();

        if (expError) throw expError;

        const splits = data.splits.map(s => ({
            expense_id: expense.id,
            user_id: s.userId,
            amount: s.amount
        }));
        const { error: splitError } = await supabase.from('expense_splits').insert(splits);
        if (splitError) throw splitError;

        return expense;
    },

    async deleteExpense(expenseId: string): Promise<void> {
        // Splits should cascade delete if configured in DB, else delete them first.
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
        if (error) throw error;
    },

    async updateExpense(id: string, updates: Partial<Expense> & { splits?: { userId: string; amount: number }[] }) {
        const { splits, ...expenseUpdates } = updates;

        // Update Expense
        if (Object.keys(expenseUpdates).length > 0) {
            const { error } = await supabase.from('expenses').update(expenseUpdates).eq('id', id);
            if (error) throw error;
        }

        // Update Splits if provided (Delete all and recreate is simplest)
        if (splits) {
            await supabase.from('expense_splits').delete().eq('expense_id', id);
            const splitData = splits.map(s => ({
                expense_id: id,
                user_id: s.userId,
                amount: s.amount
            }));
            const { error } = await supabase.from('expense_splits').insert(splitData);
            if (error) throw error;
        }

        return { id, ...updates };
    }
};

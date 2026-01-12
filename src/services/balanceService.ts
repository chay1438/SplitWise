import { supabase } from '../lib/supabase';
import { BalanceSummary } from '../types';

export const balanceService = {
    async getUserBalanceSummary(userId: string): Promise<BalanceSummary> {
        const { data, error } = await supabase
            .from('group_balances_view')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        let totalOwed = 0;
        let totalOwing = 0;
        data.forEach((r: any) => {
            const val = parseFloat(r.net_balance);
            if (val > 0) totalOwed += val;
            else totalOwing += Math.abs(val);
        });

        return { totalOwed, totalOwing, netBalance: totalOwed - totalOwing };
    },

    async getBalances(userId: string) {
        const { data, error } = await supabase
            .from('group_balances_view')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data || [];
    },

    async getGroupActionableBalances(groupId: string, currentUserId: string) {
        // 1. Get Members
        const { data: members, error: mErr } = await supabase
            .from('group_members')
            .select('user_id, profiles(full_name)')
            .eq('group_id', groupId);

        if (mErr || !members) throw mErr || new Error("No members");

        // 2. Get Expenses (Expanded) for calculation
        const { data: expenses, error: eErr } = await supabase
            .from('expenses')
            .select('*, splits(*)')
            .eq('group_id', groupId);

        if (eErr) throw eErr;

        // 3. Get Settlements
        const { data: settlements, error: sErr } = await supabase
            .from('settlements')
            .select('*')
            .eq('group_id', groupId);

        if (sErr) throw sErr;

        const directBalances: Record<string, number> = {};

        // --- PROCESSING EXPENSES ---
        expenses?.forEach(exp => {
            const mySplit = exp.splits.find((s: any) => s.user_id === currentUserId);
            const payerId = exp.payer_id;

            if (!mySplit && payerId !== currentUserId) return;

            // If I paid
            if (payerId === currentUserId) {
                exp.splits.forEach((s: any) => {
                    if (s.user_id === currentUserId) return; // My own share
                    // I lent them s.amount, they owe me (+)
                    directBalances[s.user_id] = (directBalances[s.user_id] || 0) + parseFloat(s.amount);
                });
            }
            // If someone else paid
            else {
                // payerId lent Me mySplit.amount, I owe them (-)
                if (mySplit) {
                    directBalances[payerId] = (directBalances[payerId] || 0) - parseFloat(mySplit.amount);
                }
            }
        });

        // --- PROCESSING SETTLEMENTS ---
        // Settlement reduces the debt.
        // Payer (Person paying) -> Payee (Person receiving) creates a flow of money.
        settlements?.forEach(settle => {
            const isPayer = settle.payer_id === currentUserId; // I paid
            const isPayee = settle.payee_id === currentUserId; // I received
            const amount = parseFloat(settle.amount);

            if (isPayer) {
                // I paid 'payee'.
                // If balances[payee] was negative (I owed them), this adds to it (moves towards 0).
                // Example: Balance = -50 (I owe 50). I pay 50. Balance += 50 -> 0.
                const otherId = settle.payee_id;
                directBalances[otherId] = (directBalances[otherId] || 0) + amount;
            } else if (isPayee) {
                // Someone paid me.
                // If balances[payer] was positive (They owed me), this subtracts from it.
                // Example: Balance = +50 (They owe 50). They pay 50. Balance -= 50 -> 0.
                const otherId = settle.payer_id;
                directBalances[otherId] = (directBalances[otherId] || 0) - amount;
            }
        });

        // Format Result
        return members
            .filter((m: any) => m.user_id !== currentUserId)
            .map((m: any) => ({
                userId: m.user_id,
                name: m.profiles.full_name,
                balance: directBalances[m.user_id] || 0
            }))
            .filter(i => Math.abs(i.balance) > 0.01);
    }
};

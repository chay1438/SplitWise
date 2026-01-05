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
    }
};
